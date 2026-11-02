-- 0012: private messages (inbox + conversations), the Commissioner role, a seller's products on their profile.

-- ===================================================== Commissioner role
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('Student', 'Landlord', 'Commissioner'));

-- every function that checked for exactly 'Landlord' now shows the Commissioner badge too
create function pg_temp.rep(def text, a text, b text) returns text language plpgsql as $f$
begin
  if position(a in def) = 0 then raise exception 'pattern not found: %', left(a, 60); end if;
  return replace(def, a, b);
end $f$;

do $$
declare f record; def text;
begin
  for f in select p.oid from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('profile_people', 'get_app_data') loop
    def := pg_get_functiondef(f.oid);
    def := pg_temp.rep(def, $q$case when p.role = 'Landlord' then 'Landlord' else '' end$q$, $q$case when p.role in ('Landlord', 'Commissioner') then p.role else '' end$q$);
    execute def;
  end loop;
  -- who lists a room shows on the room card
  def := pg_get_functiondef('public.room_json(public.rooms, uuid)'::regprocedure);
  def := pg_temp.rep(def, $q$'id', l.id),$q$, $q$'id', l.id, 'role', l.role),$q$);
  execute def;
  -- sign up and edit profile accept it
  def := pg_get_functiondef('public.update_profile(text,text,text,text,text,text,text)'::regprocedure);
  def := pg_temp.rep(def, $q$p_role not in ('Student', 'Landlord')$q$, $q$p_role not in ('Student', 'Landlord', 'Commissioner')$q$);
  def := pg_temp.rep(def, $q$'Role must be Student or Landlord'$q$, $q$'Role must be Student, Landlord or Commissioner'$q$);
  execute def;
  def := pg_get_functiondef('public.handle_new_user()'::regprocedure);
  def := pg_temp.rep(def, $q$case when new.raw_user_meta_data ->> 'role' = 'Landlord' then 'Landlord' else 'Student' end$q$,
                      $q$case when new.raw_user_meta_data ->> 'role' in ('Landlord', 'Commissioner') then new.raw_user_meta_data ->> 'role' else 'Student' end$q$);
  execute def;
  -- rooms: landlords and commissioners
  def := pg_get_functiondef('public.create_room(text,text,text,numeric,int,int,text,text[],date,text,text,text,text[])'::regprocedure);
  def := pg_temp.rep(def, $q$(select role from public.profiles where id = me) <> 'Landlord' then raise exception 'Only landlords can list a room'$q$,
                      $q$(select role from public.profiles where id = me) not in ('Landlord', 'Commissioner') then raise exception 'Only landlords and commissioners can list a room'$q$);
  execute def;
end $$;

-- ===================================================== messages
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  a_id uuid not null references public.profiles (id) on delete cascade,
  b_id uuid not null references public.profiles (id) on delete cascade,
  last_body text, last_sender uuid, last_at timestamptz not null default now(),
  a_read bigint not null default 0, b_read bigint not null default 0,
  created_at timestamptz not null default now(),
  check (a_id < b_id), unique (a_id, b_id)
);
create table public.messages (
  id bigint generated always as identity primary key,
  conv_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  topic_kind text check (topic_kind in ('room', 'product')), topic_id text, topic_title text,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages (conv_id, id desc);
create index conversations_a_idx on public.conversations (a_id, last_at desc);
create index conversations_b_idx on public.conversations (b_id, last_at desc);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
revoke all on public.conversations, public.messages from anon, authenticated, public;

-- may `me` write to `other`?
create function public.can_message(me uuid, other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select me <> other and exists (select 1 from public.profiles where id = other)
     and case coalesce((select who_can_message from public.user_settings where profile_id = other), 'everyone')
           when 'nobody' then false
           when 'links' then exists (select 1 from public.links where follower_id = other and followee_id = me)
           else true end
$$;

create function public.conv_unread(me uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.conversations c
  where (c.a_id = me or c.b_id = me) and c.last_sender is distinct from me
    and exists (select 1 from public.messages m where m.conv_id = c.id and m.sender_id <> me and m.id > (case when c.a_id = me then c.a_read else c.b_read end))
$$;

create function public.msg_json(m public.messages, me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', m.id, 'conv', m.conv_id, 'body', m.body, 'mine', m.sender_id = me, 'at', m.created_at, 'ago', public.ago_short(m.created_at),
    'topic', case when m.topic_kind is null then null else jsonb_build_object('kind', m.topic_kind, 'id', m.topic_id, 'title', m.topic_title) end)
$$;

create function public.person_json(p public.profiles) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle, 'avatar', p.avatar, 'verified', p.verified, 'role', p.role)
$$;

-- start (or continue) a chat with someone, optionally with a first message about a room or product
create function public.start_conversation(p_with uuid, p_body text default null, p_kind text default null, p_topic text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lo uuid; hi uuid; cid uuid; b text := nullif(btrim(coalesce(p_body, '')), '');
        tt text; m public.messages;
begin
  if me is null then raise exception 'Please log in'; end if;
  if not public.can_message(me, p_with) then raise exception 'You cannot message this person'; end if;
  lo := least(me, p_with); hi := greatest(me, p_with);
  insert into public.conversations (a_id, b_id) values (lo, hi) on conflict (a_id, b_id) do nothing;
  select id into cid from public.conversations where a_id = lo and b_id = hi;
  if b is not null then
    if p_kind = 'room' then select title into tt from public.rooms where id = p_topic;
    elsif p_kind = 'product' then select title into tt from public.products where id::text = p_topic;
    else p_kind := null; p_topic := null; end if;
    if tt is null then p_kind := null; p_topic := null; end if;
    m := public.post_message(cid, me, b, p_kind, p_topic, tt);
  end if;
  return jsonb_build_object('conv', cid, 'other', (select public.person_json(p) from public.profiles p where p.id = p_with));
end $$;

create function public.post_message(cid uuid, me uuid, b text, k text, t text, tt text) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare m public.messages;
begin
  if char_length(b) < 1 or char_length(b) > 1000 then raise exception 'Message must be 1 to 1000 characters'; end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 hour') >= 120 then raise exception 'You are sending too fast. Try again later'; end if;
  insert into public.messages (conv_id, sender_id, body, topic_kind, topic_id, topic_title) values (cid, me, b, k, t, tt) returning * into m;
  update public.conversations set last_body = left(b, 120), last_sender = me, last_at = m.created_at,
    a_read = case when a_id = me then m.id else a_read end, b_read = case when b_id = me then m.id else b_read end where id = cid;
  return m;
end $$;

create function public.send_message(p_conv uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); c public.conversations; other uuid; m public.messages;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into c from public.conversations where id = p_conv and (a_id = me or b_id = me);
  if c.id is null then raise exception 'Conversation not found'; end if;
  other := case when c.a_id = me then c.b_id else c.a_id end;
  if not public.can_message(me, other) then raise exception 'You cannot message this person'; end if;
  m := public.post_message(p_conv, me, btrim(coalesce(p_body, '')), null, null, null);
  return public.msg_json(m, me);
end $$;

create function public.get_conversations(p_limit int default 20, p_ts timestamptz default null, p_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 20), 1), 50); items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  with pg as (
    select row_number() over (order by c.last_at desc, c.id desc)::int rn, c.* from public.conversations c
    where (c.a_id = me or c.b_id = me) and c.last_body is not null and (p_ts is null or (c.last_at, c.id) < (p_ts, p_id))
    order by c.last_at desc, c.id desc limit lim + 1)
  select coalesce(jsonb_agg(jsonb_build_object('id', pg.id, 'other', public.person_json(o), 'last', pg.last_body, 'mine', pg.last_sender = me,
            'at', pg.last_at, 'ago', public.ago_short(pg.last_at),
            'unread', pg.last_sender <> me and exists (select 1 from public.messages m where m.conv_id = pg.id and m.sender_id <> me and m.id > (case when pg.a_id = me then pg.a_read else pg.b_read end)))
            order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.last_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid
    from pg join public.profiles o on o.id = case when pg.a_id = me then pg.b_id else pg.a_id end;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('items', items, 'next', nxt, 'unread', public.conv_unread(me));
end $$;

-- the newest messages of one chat (oldest first); opening it marks it as read
create function public.get_messages(p_conv uuid, p_limit int default 30, p_before bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); c public.conversations; lim int := least(greatest(coalesce(p_limit, 30), 1), 60); items jsonb; got int; mx bigint; oth public.profiles;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into c from public.conversations where id = p_conv and (a_id = me or b_id = me);
  if c.id is null then return null; end if;
  select * into oth from public.profiles where id = case when c.a_id = me then c.b_id else c.a_id end;
  select coalesce(jsonb_agg(public.msg_json(x, me) order by x.id), '[]'::jsonb) into items
    from (select m.* from public.messages m where m.conv_id = p_conv and (p_before is null or m.id < p_before) order by m.id desc limit lim) x;
  select count(*)::int into got from (select 1 from public.messages m where m.conv_id = p_conv and (p_before is null or m.id < p_before) limit lim + 1) z;
  select max(id) into mx from public.messages where conv_id = p_conv;
  if p_before is null and mx is not null then
    update public.conversations set a_read = case when a_id = me then mx else a_read end, b_read = case when b_id = me then mx else b_read end where id = p_conv;
  end if;
  return jsonb_build_object('conv', p_conv, 'other', public.person_json(oth), 'messages', items, 'more', got > lim,
                            'canWrite', public.can_message(me, oth.id), 'unread', public.conv_unread(me));
end $$;

create function public.mark_conversation_read(p_conv uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); mx bigint;
begin
  if me is null then raise exception 'Please log in'; end if;
  select max(id) into mx from public.messages where conv_id = p_conv;
  update public.conversations set a_read = case when a_id = me then coalesce(mx, a_read) else a_read end, b_read = case when b_id = me then coalesce(mx, b_read) else b_read end
   where id = p_conv and (a_id = me or b_id = me);
  return public.conv_unread(me);
end $$;

-- one light call the app repeats: the unread count plus anything new for me since message `p_after`
create function public.poll_messages(p_after bigint default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); items jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  select coalesce(jsonb_agg(public.msg_json(m, me) order by m.id), '[]'::jsonb) into items from (
    select m.* from public.messages m join public.conversations c on c.id = m.conv_id
    where (c.a_id = me or c.b_id = me) and m.id > coalesce(p_after, 0) order by m.id limit 50) m;
  return jsonb_build_object('items', items, 'unread', public.conv_unread(me),
    'maxId', coalesce((select max(m.id) from public.messages m join public.conversations c on c.id = m.conv_id where c.a_id = me or c.b_id = me), 0));
end $$;

-- ===================================================== a seller's products, for the profile tab
create function public.get_profile_products(p_profile uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  if p_profile <> me and coalesce((select private_account from public.user_settings where profile_id = p_profile), false)
     and not exists (select 1 from public.links where follower_id = me and followee_id = p_profile) then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(public.product_json(p, me) order by p.created_at desc, p.id desc)
                   from (select * from public.products where seller_id = p_profile and (status = 'active' or p_profile = me)
                         order by created_at desc, id desc limit 60) p), '[]'::jsonb);
end $$;

-- ===================================================== who may call what
revoke all on function public.can_message(uuid, uuid), public.conv_unread(uuid), public.msg_json(public.messages, uuid), public.person_json(public.profiles),
  public.post_message(uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.start_conversation(uuid, text, text, text), public.send_message(uuid, text), public.get_conversations(int, timestamptz, uuid),
  public.get_messages(uuid, int, bigint), public.mark_conversation_read(uuid), public.poll_messages(bigint), public.get_profile_products(uuid) from public, anon;
grant execute on function public.start_conversation(uuid, text, text, text), public.send_message(uuid, text), public.get_conversations(int, timestamptz, uuid),
  public.get_messages(uuid, int, bigint), public.mark_conversation_read(uuid), public.poll_messages(bigint), public.get_profile_products(uuid) to authenticated;
