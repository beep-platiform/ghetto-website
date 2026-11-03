-- 0013: messaging upgrade: ticks, unsend, edit, reply, photos, typing, search, filters, requests, archive/pin/mute, block, settings.

-- ===================================================== columns and tables
alter table public.messages
  add column deleted_at timestamptz, add column edited_at timestamptz,
  add column reply_to bigint references public.messages (id) on delete set null, add column photo text;
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check
  check (char_length(body) <= 1000 and (char_length(body) >= 1 or photo is not null or deleted_at is not null));
alter table public.conversations add column a_deliv bigint not null default 0, add column b_deliv bigint not null default 0;
alter table public.profiles add column last_active_at timestamptz;
alter table public.reports drop constraint reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('post', 'comment', 'profile', 'room', 'product', 'message'));

create table public.message_hides (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  message_id bigint not null references public.messages (id) on delete cascade,
  primary key (profile_id, message_id));
create table public.conv_prefs (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  conv_id uuid not null references public.conversations (id) on delete cascade,
  muted boolean not null default false, archived boolean not null default false, pinned boolean not null default false,
  marked_unread boolean not null default false, accepted boolean not null default false, cleared_before bigint not null default 0,
  primary key (profile_id, conv_id));
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id), check (blocker_id <> blocked_id));
create table public.typing_state (
  conv_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  at timestamptz not null default now(),
  primary key (conv_id, profile_id));
create table public.message_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  read_receipts boolean not null default true, show_last_active boolean not null default true, sounds boolean not null default true,
  updated_at timestamptz not null default now());
alter table public.message_hides enable row level security;
alter table public.conv_prefs enable row level security;
alter table public.blocks enable row level security;
alter table public.typing_state enable row level security;
alter table public.message_settings enable row level security;
revoke all on public.message_hides, public.conv_prefs, public.blocks, public.typing_state, public.message_settings from anon, authenticated, public;
create index messages_conv_sender_idx on public.messages (conv_id, sender_id);

-- ===================================================== small helpers
create or replace function public.can_message(me uuid, other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select me <> other and exists (select 1 from public.profiles where id = other)
     and not exists (select 1 from public.blocks where (blocker_id = me and blocked_id = other) or (blocker_id = other and blocked_id = me))
     and case coalesce((select who_can_message from public.user_settings where profile_id = other), 'everyone')
           when 'nobody' then false
           when 'links' then exists (select 1 from public.links where follower_id = other and followee_id = me)
           else true end
$$;

create function public.msg_flag(p uuid, k text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case k when 'receipts' then coalesce((select read_receipts from public.message_settings where profile_id = p), true)
                when 'seen' then coalesce((select show_last_active from public.message_settings where profile_id = p), true)
                else coalesce((select sounds from public.message_settings where profile_id = p), true) end
$$;

create or replace function public.msg_json(m public.messages, me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', m.id, 'conv', m.conv_id, 'body', m.body, 'photo', m.photo, 'mine', m.sender_id = me, 'at', m.created_at,
    'ago', public.ago_short(m.created_at), 'deleted', m.deleted_at is not null, 'edited', m.edited_at is not null,
    'topic', case when m.topic_kind is null then null else jsonb_build_object('kind', m.topic_kind, 'id', m.topic_id, 'title', m.topic_title) end,
    'reply', (select jsonb_build_object('id', r.id, 'body', case when r.deleted_at is null then left(r.body, 90) else '' end,
                'photo', r.deleted_at is null and r.photo is not null, 'deleted', r.deleted_at is not null, 'mine', r.sender_id = me)
              from public.messages r where r.id = m.reply_to))
$$;

-- every chat of mine with its newest visible message and my own switches
create function public.conv_rows(me uuid) returns table (id uuid, last_at timestamptz, pinned boolean, archived boolean, is_req boolean, flagged boolean, muted boolean, topic text, item jsonb)
language sql stable security definer set search_path = '' as $$
  select s.id, s.last_at, s.pinned, s.archived, s.is_req, (s.unread or s.marked), s.muted, s.topic,
    jsonb_build_object('id', s.id, 'other', public.person_json(o), 'last', s.lm_body, 'photo', s.lm_photo, 'deleted', s.lm_deleted, 'mine', s.lm_mine,
      'at', s.last_at, 'ago', public.ago_short(s.last_at), 'unread', (s.unread or s.marked), 'muted', s.muted, 'pinned', s.pinned,
      'archived', s.archived, 'request', s.is_req, 'topic', s.topic)
  from (
    select c.id, lm.created_at last_at, lm.body lm_body, lm.photo is not null lm_photo, lm.deleted_at is not null lm_deleted, lm.sender_id = me lm_mine,
      case when c.a_id = me then c.b_id else c.a_id end other_id,
      coalesce(cp.pinned, false) pinned, coalesce(cp.archived, false) archived, coalesce(cp.muted, false) muted, coalesce(cp.marked_unread, false) marked,
      exists (select 1 from public.messages m where m.conv_id = c.id and m.sender_id <> me and m.deleted_at is null
                and m.id > (case when c.a_id = me then c.a_read else c.b_read end) and m.id > coalesce(cp.cleared_before, 0)
                and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id)) unread,
      (not coalesce(cp.accepted, false)
        and not exists (select 1 from public.messages m where m.conv_id = c.id and m.sender_id = me)
        and not exists (select 1 from public.links l where l.follower_id = me and l.followee_id = (case when c.a_id = me then c.b_id else c.a_id end))
        and not exists (select 1 from public.messages m where m.conv_id = c.id and m.sender_id <> me and m.topic_kind is not null)) is_req,
      (select m.topic_kind from public.messages m where m.conv_id = c.id and m.topic_kind is not null and m.id > coalesce(cp.cleared_before, 0) order by m.id desc limit 1) topic
    from public.conversations c
    left join public.conv_prefs cp on cp.conv_id = c.id and cp.profile_id = me
    cross join lateral (select m.* from public.messages m where m.conv_id = c.id and m.id > coalesce(cp.cleared_before, 0)
                          and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id)
                        order by m.id desc limit 1) lm
    where c.a_id = me or c.b_id = me) s
  join public.profiles o on o.id = s.other_id
$$;

create or replace function public.conv_unread(me uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.conv_rows(me) r where not r.archived and not r.muted and not r.is_req and r.flagged
$$;

-- ===================================================== sending
drop function public.post_message(uuid, uuid, text, text, text, text);
create function public.post_message(cid uuid, me uuid, b text, k text, t text, tt text, reply bigint, ph text) returns public.messages
language plpgsql security definer set search_path = '' as $$
declare m public.messages; other uuid;
begin
  b := coalesce(b, '');
  if char_length(b) > 1000 then raise exception 'Message must be up to 1000 characters'; end if;
  if char_length(b) < 1 and ph is null then raise exception 'Write a message first'; end if;
  if reply is not null and not exists (select 1 from public.messages where id = reply and conv_id = cid) then reply := null; end if;
  if (select count(*) from public.messages where sender_id = me and created_at > now() - interval '1 hour') >= 120 then raise exception 'You are sending too fast. Try again later'; end if;
  insert into public.messages (conv_id, sender_id, body, topic_kind, topic_id, topic_title, reply_to, photo) values (cid, me, b, k, t, tt, reply, ph) returning * into m;
  update public.conversations set last_body = case when b = '' then 'Photo' else left(b, 120) end, last_sender = me, last_at = m.created_at,
    a_read = case when a_id = me then m.id else a_read end, b_read = case when b_id = me then m.id else b_read end where id = cid
    returning case when a_id = me then b_id else a_id end into other;
  insert into public.conv_prefs (profile_id, conv_id, accepted) values (me, cid, true)
    on conflict (profile_id, conv_id) do update set accepted = true, marked_unread = false;
  insert into public.conv_prefs (profile_id, conv_id) values (other, cid) on conflict (profile_id, conv_id) do update set archived = false;
  delete from public.typing_state where conv_id = cid and profile_id = me;
  return m;
end $$;

create or replace function public.start_conversation(p_with uuid, p_body text default null, p_kind text default null, p_topic text default null) returns jsonb
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
    m := public.post_message(cid, me, b, p_kind, p_topic, tt, null, null);
  end if;
  return jsonb_build_object('conv', cid, 'other', (select public.person_json(p) from public.profiles p where p.id = p_with));
end $$;

drop function public.send_message(uuid, text);
create function public.send_message(p_conv uuid, p_body text, p_reply bigint default null, p_photo text default null, p_kind text default null, p_topic text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); c public.conversations; other uuid; m public.messages; tt text; b text := btrim(coalesce(p_body, ''));
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into c from public.conversations where id = p_conv and (a_id = me or b_id = me);
  if c.id is null then raise exception 'Conversation not found'; end if;
  other := case when c.a_id = me then c.b_id else c.a_id end;
  if not public.can_message(me, other) then raise exception 'You cannot message this person'; end if;
  if p_photo is not null then perform public.photos_ok(array[p_photo], 1, 1); end if;
  if p_kind = 'room' then select title into tt from public.rooms where id = p_topic;
  elsif p_kind = 'product' then select title into tt from public.products where id::text = p_topic; end if;
  if tt is null then p_kind := null; p_topic := null; end if;
  m := public.post_message(p_conv, me, b, p_kind, p_topic, tt, p_reply, p_photo);
  return public.msg_json(m, me);
end $$;

create function public.edit_message(p_msg bigint, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); m public.messages; b text := btrim(coalesce(p_body, ''));
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into m from public.messages where id = p_msg and sender_id = me and deleted_at is null;
  if m.id is null then raise exception 'Message not found'; end if;
  if m.created_at < now() - interval '15 minutes' then raise exception 'You can edit a message for 15 minutes'; end if;
  if char_length(b) < 1 or char_length(b) > 1000 then raise exception 'Message must be 1 to 1000 characters'; end if;
  update public.messages set body = b, edited_at = now() where id = p_msg returning * into m;
  update public.conversations set last_body = left(b, 120) where id = m.conv_id and last_sender = me and not exists (select 1 from public.messages x where x.conv_id = m.conv_id and x.id > m.id);
  return public.msg_json(m, me);
end $$;

-- unsend: the text and photo are really removed for both people; the photo address comes back so the app can delete the file
create function public.unsend_message(p_msg bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); m public.messages; ph text;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into m from public.messages where id = p_msg and sender_id = me and deleted_at is null;
  if m.id is null then raise exception 'Message not found'; end if;
  ph := m.photo;
  update public.messages set body = '', photo = null, deleted_at = now(), topic_kind = null, topic_id = null, topic_title = null where id = p_msg;
  update public.conversations set last_body = '' where id = m.conv_id and last_sender = me and not exists (select 1 from public.messages x where x.conv_id = m.conv_id and x.id > m.id);
  return jsonb_build_object('id', p_msg, 'photo', ph);
end $$;

create function public.hide_message(p_msg bigint) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  if not exists (select 1 from public.messages m join public.conversations c on c.id = m.conv_id where m.id = p_msg and (c.a_id = me or c.b_id = me)) then raise exception 'Message not found'; end if;
  insert into public.message_hides (profile_id, message_id) values (me, p_msg) on conflict do nothing;
  return true;
end $$;

-- ===================================================== reading
drop function public.get_conversations(int, timestamptz, uuid);
create function public.get_conversations(p_limit int default 20, p_ts timestamptz default null, p_id uuid default null, p_filter text default 'all') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 20), 1), 50); f text := coalesce(p_filter, 'all');
        pins jsonb := '[]'::jsonb; items jsonb; got int; nxt jsonb; pinok boolean := f in ('all', 'unread', 'rooms', 'products');
begin
  if me is null then raise exception 'Please log in'; end if;
  with ok as (
    select r.id, r.last_at, r.pinned, r.item from public.conv_rows(me) r where case f
      when 'archived' then r.archived
      when 'requests' then r.is_req and not r.archived
      when 'unread' then r.flagged and not r.archived and not r.is_req
      when 'rooms' then r.topic = 'room' and not r.archived and not r.is_req
      when 'products' then r.topic = 'product' and not r.archived and not r.is_req
      else not r.archived and not r.is_req end),
  pg as (select o.*, row_number() over (order by o.last_at desc, o.id desc) rn from ok o
         where (not pinok or not o.pinned) and (p_ts is null or (o.last_at, o.id) < (p_ts, p_id)))
  select coalesce((select jsonb_agg(o.item order by o.last_at desc) from ok o where pinok and o.pinned and p_ts is null), '[]'::jsonb),
         coalesce(jsonb_agg(pg.item order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb),
         count(*)::int,
         (select jsonb_build_object('ts', q.last_at, 'id', q.id) from pg q where q.rn = lim)
    into pins, items, got, nxt from pg;
  if got <= lim then nxt := null; end if;
  return jsonb_build_object('items', pins || items, 'next', nxt, 'unread', public.conv_unread(me),
    'counts', (select jsonb_build_object('requests', count(*) filter (where r.is_req and not r.archived), 'archived', count(*) filter (where r.archived),
                'unread', count(*) filter (where r.flagged and not r.archived and not r.is_req)) from public.conv_rows(me) r));
end $$;

create function public.search_conversations(p_q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); q text := btrim(coalesce(p_q, '')); pat text;
begin
  if me is null then raise exception 'Please log in'; end if;
  if char_length(q) < 2 then return '[]'::jsonb; end if;
  pat := '%' || replace(replace(replace(q, '\', ''), '%', ''), '_', '') || '%';
  return coalesce((select jsonb_agg(x.item || jsonb_build_object('match', x.snip) order by x.last_at desc) from (
    select r.item, r.last_at,
      (select left(m.body, 90) from public.messages m left join public.conv_prefs cp on cp.conv_id = m.conv_id and cp.profile_id = me
        where m.conv_id = r.id and m.deleted_at is null and m.body ilike pat and m.id > coalesce(cp.cleared_before, 0)
          and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id) order by m.id desc limit 1) snip
    from public.conv_rows(me) r
    where (r.item #>> '{other,name}') ilike pat or (r.item #>> '{other,handle}') ilike pat
       or exists (select 1 from public.messages m left join public.conv_prefs cp on cp.conv_id = m.conv_id and cp.profile_id = me
                  where m.conv_id = r.id and m.deleted_at is null and m.body ilike pat and m.id > coalesce(cp.cleared_before, 0)
                    and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id))
    order by r.last_at desc limit 30) x), '[]'::jsonb);
end $$;

create or replace function public.get_messages(p_conv uuid, p_limit int default 30, p_before bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); c public.conversations; lim int := least(greatest(coalesce(p_limit, 30), 1), 60); items jsonb; got int; mx bigint; oth public.profiles;
        cleared bigint; cp public.conv_prefs; both_rcpt boolean; peer_read bigint; peer_deliv bigint; req boolean;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into c from public.conversations where id = p_conv and (a_id = me or b_id = me);
  if c.id is null then return null; end if;
  select * into oth from public.profiles where id = case when c.a_id = me then c.b_id else c.a_id end;
  select * into cp from public.conv_prefs where profile_id = me and conv_id = p_conv;
  cleared := coalesce(cp.cleared_before, 0);
  select coalesce(jsonb_agg(public.msg_json(x, me) order by x.id), '[]'::jsonb) into items
    from (select m.* from public.messages m where m.conv_id = p_conv and m.id > cleared and (p_before is null or m.id < p_before)
            and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id) order by m.id desc limit lim) x;
  select count(*)::int into got from (select 1 from public.messages m where m.conv_id = p_conv and m.id > cleared and (p_before is null or m.id < p_before)
            and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id) limit lim + 1) z;
  if p_before is null then
    select max(id) into mx from public.messages where conv_id = p_conv;
    update public.conversations set a_read = case when a_id = me then coalesce(mx, a_read) else a_read end, b_read = case when b_id = me then coalesce(mx, b_read) else b_read end,
      a_deliv = case when a_id = me then coalesce(mx, a_deliv) else a_deliv end, b_deliv = case when b_id = me then coalesce(mx, b_deliv) else b_deliv end where id = p_conv;
    update public.conv_prefs set marked_unread = false where profile_id = me and conv_id = p_conv;
  end if;
  both_rcpt := public.msg_flag(me, 'receipts') and public.msg_flag(oth.id, 'receipts');
  peer_read := case when c.a_id = me then c.b_read else c.a_read end;
  peer_deliv := case when c.a_id = me then c.b_deliv else c.a_deliv end;
  select r.is_req into req from public.conv_rows(me) r where r.id = p_conv;
  return jsonb_build_object('conv', p_conv, 'other', public.person_json(oth), 'messages', items, 'more', got > lim,
    'canWrite', public.can_message(me, oth.id), 'iBlocked', exists (select 1 from public.blocks where blocker_id = me and blocked_id = oth.id),
    'request', coalesce(req, false),
    'prefs', jsonb_build_object('muted', coalesce(cp.muted, false), 'pinned', coalesce(cp.pinned, false), 'archived', coalesce(cp.archived, false)),
    'peer', jsonb_build_object('read', case when both_rcpt then peer_read else null end, 'deliv', peer_deliv,
       'seen', case when public.msg_flag(me, 'seen') and public.msg_flag(oth.id, 'seen') then oth.last_active_at else null end,
       'typing', exists (select 1 from public.typing_state where conv_id = p_conv and profile_id = oth.id and at > now() - interval '6 seconds')),
    'unread', public.conv_unread(me));
end $$;

create or replace function public.mark_conversation_read(p_conv uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); mx bigint;
begin
  if me is null then raise exception 'Please log in'; end if;
  select max(id) into mx from public.messages where conv_id = p_conv;
  update public.conversations set a_read = case when a_id = me then coalesce(mx, a_read) else a_read end, b_read = case when b_id = me then coalesce(mx, b_read) else b_read end,
      a_deliv = case when a_id = me then coalesce(mx, a_deliv) else a_deliv end, b_deliv = case when b_id = me then coalesce(mx, b_deliv) else b_deliv end
   where id = p_conv and (a_id = me or b_id = me);
  update public.conv_prefs set marked_unread = false where profile_id = me and conv_id = p_conv;
  return public.conv_unread(me);
end $$;

-- ===================================================== polling (new messages + changes + delivery + typing)
drop function public.poll_messages(bigint);
create or replace function public.poll_messages(p_after bigint default 0, p_conv uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); items jsonb; mx bigint; recent jsonb := null; peer jsonb := null; cv public.conversations; oth public.profiles; both_rcpt boolean;
begin
  if me is null then raise exception 'Please log in'; end if;
  update public.profiles set last_active_at = now() where id = me and (last_active_at is null or last_active_at < now() - interval '30 seconds');
  select max(m.id) into mx from public.messages m join public.conversations c on c.id = m.conv_id where c.a_id = me or c.b_id = me;
  -- everything that reached me counts as delivered
  update public.conversations set a_deliv = greatest(a_deliv, coalesce(mx, 0)) where a_id = me and a_deliv < coalesce(mx, 0);
  update public.conversations set b_deliv = greatest(b_deliv, coalesce(mx, 0)) where b_id = me and b_deliv < coalesce(mx, 0);
  select coalesce(jsonb_agg(public.msg_json(m, me) order by m.id), '[]'::jsonb) into items from (
    select m.* from public.messages m join public.conversations c on c.id = m.conv_id
    where (c.a_id = me or c.b_id = me) and m.id > coalesce(p_after, 0)
      and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id)
      and m.id > coalesce((select cp.cleared_before from public.conv_prefs cp where cp.conv_id = m.conv_id and cp.profile_id = me), 0)
    order by m.id limit 50) m;
  if p_conv is not null then
    select * into cv from public.conversations where id = p_conv and (a_id = me or b_id = me);
    if cv.id is not null then
      select * into oth from public.profiles where id = case when cv.a_id = me then cv.b_id else cv.a_id end;
      both_rcpt := public.msg_flag(me, 'receipts') and public.msg_flag(oth.id, 'receipts');
      select coalesce(jsonb_agg(public.msg_json(m, me) order by m.id), '[]'::jsonb) into recent from (
        select m.* from public.messages m where m.conv_id = p_conv
          and not exists (select 1 from public.message_hides h where h.profile_id = me and h.message_id = m.id)
          and m.id > coalesce((select cp.cleared_before from public.conv_prefs cp where cp.conv_id = p_conv and cp.profile_id = me), 0)
        order by m.id desc limit 30) m;
      peer := jsonb_build_object('read', case when both_rcpt then (case when cv.a_id = me then cv.b_read else cv.a_read end) else null end,
        'deliv', case when cv.a_id = me then cv.b_deliv else cv.a_deliv end,
        'seen', case when public.msg_flag(me, 'seen') and public.msg_flag(oth.id, 'seen') then oth.last_active_at else null end,
        'typing', exists (select 1 from public.typing_state where conv_id = p_conv and profile_id = oth.id and at > now() - interval '6 seconds'),
        'canWrite', public.can_message(me, oth.id));
    end if;
  end if;
  return jsonb_build_object('items', items, 'unread', public.conv_unread(me), 'maxId', coalesce(mx, 0), 'recent', recent, 'peer', peer);
end $$;

-- ===================================================== per-chat switches, delete, block, typing, settings
create function public.set_conv_pref(p_conv uuid, p_key text, p_value boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  if not exists (select 1 from public.conversations where id = p_conv and (a_id = me or b_id = me)) then raise exception 'Conversation not found'; end if;
  if p_key not in ('muted', 'archived', 'pinned', 'marked_unread', 'accepted') then raise exception 'Unknown setting'; end if;
  insert into public.conv_prefs (profile_id, conv_id) values (me, p_conv) on conflict do nothing;
  update public.conv_prefs set muted = case when p_key = 'muted' then p_value else muted end,
    archived = case when p_key = 'archived' then p_value else archived end,
    pinned = case when p_key = 'pinned' then p_value else pinned end,
    marked_unread = case when p_key = 'marked_unread' then p_value else marked_unread end,
    accepted = case when p_key = 'accepted' then p_value else accepted end
  where profile_id = me and conv_id = p_conv;
  return true;
end $$;

-- delete chat for me only: everything up to now disappears from my side
create function public.delete_conversation(p_conv uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); mx bigint;
begin
  if me is null then raise exception 'Please log in'; end if;
  if not exists (select 1 from public.conversations where id = p_conv and (a_id = me or b_id = me)) then raise exception 'Conversation not found'; end if;
  select coalesce(max(id), 0) into mx from public.messages where conv_id = p_conv;
  insert into public.conv_prefs (profile_id, conv_id, cleared_before) values (me, p_conv, mx)
    on conflict (profile_id, conv_id) do update set cleared_before = mx, pinned = false, archived = false, marked_unread = false;
  update public.conversations set a_read = case when a_id = me then mx else a_read end, b_read = case when b_id = me then mx else b_read end where id = p_conv;
  return true;
end $$;

create function public.block_user(p_user uuid, p_on boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  if p_user = me then raise exception 'You cannot block yourself'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Person not found'; end if;
  if p_on then insert into public.blocks (blocker_id, blocked_id) values (me, p_user) on conflict do nothing;
  else delete from public.blocks where blocker_id = me and blocked_id = p_user; end if;
  return p_on;
end $$;

create function public.get_blocked() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  return coalesce((select jsonb_agg(public.person_json(p) order by b.created_at desc) from public.blocks b join public.profiles p on p.id = b.blocked_id where b.blocker_id = me), '[]'::jsonb);
end $$;

create function public.set_typing(p_conv uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then return false; end if;
  if not exists (select 1 from public.conversations where id = p_conv and (a_id = me or b_id = me)) then return false; end if;
  insert into public.typing_state (conv_id, profile_id, at) values (p_conv, me, now()) on conflict (conv_id, profile_id) do update set at = now();
  return true;
end $$;

create function public.get_message_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  return jsonb_build_object('read_receipts', public.msg_flag(me, 'receipts'), 'show_last_active', public.msg_flag(me, 'seen'), 'sounds', public.msg_flag(me, 'sounds'));
end $$;

create function public.update_message_setting(p_key text, p_value boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  if p_key not in ('read_receipts', 'show_last_active', 'sounds') then raise exception 'Unknown setting'; end if;
  insert into public.message_settings (profile_id) values (me) on conflict do nothing;
  update public.message_settings set read_receipts = case when p_key = 'read_receipts' then p_value else read_receipts end,
    show_last_active = case when p_key = 'show_last_active' then p_value else show_last_active end,
    sounds = case when p_key = 'sounds' then p_value else sounds end, updated_at = now() where profile_id = me;
  return p_value;
end $$;

-- ===================================================== reports (message + person) and photo cleanup
create or replace function public.report_content(p_kind text, p_target text, p_reason text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); t text := btrim(coalesce(p_target, '')); ok boolean := false;
begin
  if me is null then raise exception 'Please log in'; end if;
  if p_reason not in ('spam', 'scam', 'inappropriate', 'harassment', 'wrong_info', 'other') then raise exception 'Choose a reason'; end if;
  if p_note is not null and char_length(p_note) > 300 then raise exception 'Note is too long'; end if;
  if p_kind = 'post' then ok := t ~ '^[0-9a-f-]{36}$' and exists (select 1 from public.posts where id = t::uuid);
  elsif p_kind = 'comment' then ok := t ~ '^[0-9]{1,18}$' and exists (select 1 from public.comments where id = t::bigint);
  elsif p_kind = 'profile' then ok := t ~ '^[0-9a-f-]{36}$' and exists (select 1 from public.profiles where id = t::uuid);
  elsif p_kind = 'room' then ok := exists (select 1 from public.rooms where id = t);
  elsif p_kind = 'product' then ok := t ~ '^[0-9a-f-]{36}$' and exists (select 1 from public.products where id = t::uuid);
  elsif p_kind = 'message' then
    ok := t ~ '^[0-9]{1,18}$' and exists (select 1 from public.messages m join public.conversations c on c.id = m.conv_id
                                           where m.id = t::bigint and m.sender_id <> me and (c.a_id = me or c.b_id = me));
  else raise exception 'Unknown report type'; end if;
  if not ok then raise exception 'Nothing to report'; end if;
  insert into public.reports (reporter_id, kind, target, reason, note) values (me, p_kind, t, p_reason, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (reporter_id, kind, target) do nothing;
end $$;

create or replace function public.my_photo_urls() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(u), '{}') from (
    select unnest(photos) u from public.posts where author_id = public.current_profile_id()
    union all select unnest(photos) from public.rooms where landlord_id = public.current_profile_id()
    union all select unnest(photos) from public.products where seller_id = public.current_profile_id()
    union all select photo from public.messages where sender_id = public.current_profile_id() and photo is not null) x
$$;

-- ===================================================== grants
revoke all on function public.msg_flag(uuid, text), public.conv_rows(uuid), public.post_message(uuid, uuid, text, text, text, text, bigint, text) from public, anon, authenticated;
revoke all on function public.send_message(uuid, text, bigint, text, text, text), public.edit_message(bigint, text), public.unsend_message(bigint), public.hide_message(bigint),
  public.get_conversations(int, timestamptz, uuid, text), public.search_conversations(text), public.poll_messages(bigint, uuid), public.set_conv_pref(uuid, text, boolean),
  public.delete_conversation(uuid), public.block_user(uuid, boolean), public.get_blocked(), public.set_typing(uuid), public.get_message_settings(),
  public.update_message_setting(text, boolean), public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.send_message(uuid, text, bigint, text, text, text), public.edit_message(bigint, text), public.unsend_message(bigint), public.hide_message(bigint),
  public.get_conversations(int, timestamptz, uuid, text), public.search_conversations(text), public.poll_messages(bigint, uuid), public.set_conv_pref(uuid, text, boolean),
  public.delete_conversation(uuid), public.block_user(uuid, boolean), public.get_blocked(), public.set_typing(uuid), public.get_message_settings(),
  public.update_message_setting(text, boolean), public.mark_conversation_read(uuid) to authenticated;
