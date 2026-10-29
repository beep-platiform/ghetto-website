-- 0008: the three-dot menus (save / hide / report a post, edit my post, delete a comment or notification) and
-- photos that leave storage when a post is edited or deleted (the database hands back the list, the browser removes the files).

-- ---------------------------------------------------------------- tables (closed to the browser, like the rest)
create table public.saved_posts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id));
create index saved_posts_order on public.saved_posts (profile_id, created_at desc, post_id desc);

create table public.hidden_posts (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  post_id    uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, post_id));

create table public.reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('post', 'comment', 'profile', 'room')),
  target      text not null check (char_length(target) between 1 and 80),
  reason      text not null check (reason in ('spam', 'scam', 'inappropriate', 'harassment', 'wrong_info', 'other')),
  note        text check (note is null or char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  unique (reporter_id, kind, target));

alter table public.saved_posts enable row level security;
alter table public.hidden_posts enable row level security;
alter table public.reports enable row level security;
revoke all on table public.saved_posts, public.hidden_posts, public.reports from anon, authenticated;

-- ---------------------------------------------------------------- posts carry "saved"; the feed skips posts I hid
create or replace function public.post_json(p public.posts, p_me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'title', p.title, 'subtitle', p.subtitle, 'body', p.body,
    'category', p.category, 'location', p.location, 'tag', p.tag,
    'photos', to_jsonb(p.photos), 'photoTotal', p.photo_total, 'moreCount', p.more_count, 'sign', p.sign,
    'type', p.post_type, 'price', p.price, 'tags', to_jsonb(p.tags), 'audience', p.audience, 'commentsOn', p.comments_on, 'alt', p.alt,
    'likes', p.like_count, 'shares', p.share_count,
    'liked', exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = p_me),
    'saved', exists (select 1 from public.saved_posts sp where sp.post_id = p.id and sp.profile_id = p_me),
    'ago', public.ago_short(p.created_at), 'createdAt', p.created_at,
    'cmtCount', (select count(*) from public.comments c where c.post_id = p.id),
    'top', (select jsonb_build_object('name', ca.name, 'av', ca.avatar, 'text', c.body, 'likes', c.like_count)
            from public.comments c join public.profiles ca on ca.id = c.author_id
            where c.post_id = p.id and c.parent_id is null order by c.like_count desc, c.id limit 1),
    'author', jsonb_build_object('id', a.id, 'name', a.name, 'role', a.role, 'avatar', a.avatar, 'verified', a.verified,
                                 'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a.id)))
  from public.profiles a where a.id = p.author_id
$$;

create or replace function public.get_feed(p_limit int default 8, p_ts timestamptz default null, p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 8), 1), 30);
        items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  with pg as (
    select row_number() over (order by p.created_at desc, p.id desc)::int rn, p.id, p.created_at from public.posts p
    where public.can_see_post(p, me)
      and not exists (select 1 from public.hidden_posts h where h.profile_id = me and h.post_id = p.id)
      and (p_ts is null or (p.created_at, p.id) < (p_ts, p_id))
    order by p.created_at desc, p.id desc limit lim + 1)
  select coalesce(jsonb_agg(public.post_json(po, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.created_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid from pg join public.posts po on po.id = pg.id;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('posts', items, 'next', nxt);
end $$;

-- ---------------------------------------------------------------- save / hide / report
create function public.toggle_saved_post(p_post uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); po public.posts;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into po from public.posts where id = p_post;
  if po.id is null or not public.can_see_post(po, me) then raise exception 'Post not found'; end if;
  if exists (select 1 from public.saved_posts where profile_id = me and post_id = p_post) then
    delete from public.saved_posts where profile_id = me and post_id = p_post; return false;
  end if;
  insert into public.saved_posts (profile_id, post_id) values (me, p_post);
  return true;
end $$;

-- the saved posts of the person asking, newest saved first, a page at a time (same paging as the feed)
create function public.get_saved_posts(p_limit int default 8, p_ts timestamptz default null, p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 8), 1), 30);
        items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb; total int;
begin
  if me is null then raise exception 'Please log in'; end if;
  select count(*)::int into total from public.saved_posts s join public.posts p on p.id = s.post_id
    where s.profile_id = me and public.can_see_post(p, me);
  with pg as (
    select row_number() over (order by s.created_at desc, s.post_id desc)::int rn, s.post_id id, s.created_at
    from public.saved_posts s join public.posts p on p.id = s.post_id
    where s.profile_id = me and public.can_see_post(p, me) and (p_ts is null or (s.created_at, s.post_id) < (p_ts, p_id))
    order by s.created_at desc, s.post_id desc limit lim + 1)
  select coalesce(jsonb_agg(public.post_json(po, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.created_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid from pg join public.posts po on po.id = pg.id;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('posts', items, 'next', nxt, 'count', total);
end $$;

create function public.hide_post(p_post uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  if not exists (select 1 from public.posts where id = p_post) then raise exception 'Post not found'; end if;
  insert into public.hidden_posts (profile_id, post_id) values (me, p_post) on conflict do nothing;
end $$;

create function public.report_content(p_kind text, p_target text, p_reason text, p_note text default null) returns void
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
  else raise exception 'Unknown report type'; end if;
  if not ok then raise exception 'Nothing to report'; end if;
  insert into public.reports (reporter_id, kind, target, reason, note) values (me, p_kind, t, p_reason, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (reporter_id, kind, target) do nothing;
end $$;

-- ---------------------------------------------------------------- delete / edit
-- a comment can be removed by its author or by the owner of the post; its replies go with it
create function public.delete_comment(p_comment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); c public.comments; pa uuid; n int;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into c from public.comments where id = p_comment;
  if c.id is null then raise exception 'Comment not found'; end if;
  select author_id into pa from public.posts where id = c.post_id;
  if c.author_id <> me and pa is distinct from me then raise exception 'You can only delete your own comments'; end if;
  select count(*)::int into n from public.comments where id = c.id or parent_id = c.id;
  delete from public.comments where id = c.id;
  return jsonb_build_object('removed', n, 'post', c.post_id);
end $$;

create function public.delete_notifications(p_ids bigint[]) returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  delete from public.notifications where user_id = me and id = any (coalesce(p_ids, '{}'));
  return public.notif_unread(me);
end $$;

-- deleting a post tells the browser which photo files to remove from storage
create or replace function public.delete_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); ph text[];
begin
  delete from public.posts where id = p_post and author_id = me returning photos into ph;
  if not found then raise exception 'You can only delete your own posts'; end if;
  return jsonb_build_object('deleted', true, 'photos', to_jsonb(coalesce(ph, '{}')));
end $$;

-- every photo link on my posts (used to clear storage before the account is deleted)
create function public.my_photo_urls() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(u), '{}') from public.posts p, unnest(p.photos) u where p.author_id = public.current_profile_id()
$$;

-- edit my post: text, topics, who sees it, comments, and which photos stay. Photos taken off are returned so the browser can delete the files.
create function public.update_post(p_post uuid, p_title text, p_body text, p_location text, p_price integer, p_tags text[],
                                   p_audience text, p_comments boolean, p_alt text, p_photos text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.current_profile_id(); po public.posts; np public.posts;
  t text := btrim(coalesce(p_title, '')); b text := btrim(coalesce(p_body, '')); loc text := nullif(btrim(coalesce(p_location, '')), '');
  ph text[]; u text; removed text[]; tg text[] := '{}'; x text; pr integer; kw text; k text;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into po from public.posts where id = p_post and author_id = me;
  if po.id is null then raise exception 'You can only edit your own posts'; end if;
  if char_length(t) < 1 or char_length(t) > 140 then raise exception 'Title must be 1 to 140 characters'; end if;
  if char_length(b) < 1 or char_length(b) > 2000 then raise exception 'Text must be 1 to 2000 characters'; end if;
  if loc is not null and char_length(loc) > 60 then raise exception 'Location is too long'; end if;
  if coalesce(p_audience, 'everyone') not in ('everyone', 'links') then raise exception 'Unknown audience'; end if;
  if p_alt is not null and char_length(p_alt) > 200 then raise exception 'Photo description is too long'; end if;
  if p_price is not null and (p_price < 0 or p_price > 100000000) then raise exception 'Invalid price'; end if;
  -- photos: only ones the post already has (no new links through here), no repeats
  ph := '{}';
  foreach u in array coalesce(p_photos, po.photos) loop
    if not (u = any (po.photos)) then raise exception 'Invalid photo'; end if;
    if not (u = any (ph)) then ph := ph || u; end if;
  end loop;
  removed := array(select unnest(po.photos) except select unnest(ph));
  foreach x in array coalesce(p_tags, '{}') loop
    x := lower(regexp_replace(coalesce(x, ''), '[^A-Za-z0-9_]', '', 'g'));
    if char_length(x) between 2 and 24 and not (x = any (tg)) and cardinality(tg) < 5 then tg := tg || x; end if;
  end loop;
  pr := case when po.post_type in ('room', 'price') then p_price end;
  kw := case po.post_type when 'room' then 'room housing campus landlord' when 'price' then 'price market food' when 'question' then 'question help'
                          when 'event' then 'event campus' else 'tip guide campus' end;
  k := case when cardinality(ph) >= 2 or (po.post_type = 'room' and cardinality(ph) >= 1) then 'featured' else 'compact' end;
  update public.posts set title = t, body = b, location = loc, price = pr,
         sign = case when pr is not null then to_char(pr, 'FM999,999,999') || ' RWF' end,
         tags = tg, category = btrim(kw || ' ' || array_to_string(tg, ' ')),
         photos = ph, photo_total = cardinality(ph), more_count = greatest(cardinality(ph) - 3, 0), kind = k,
         audience = coalesce(p_audience, 'everyone'), comments_on = coalesce(p_comments, true),
         alt = case when cardinality(ph) > 0 then nullif(btrim(coalesce(p_alt, '')), '') end
   where id = po.id returning * into np;
  return jsonb_build_object('post', public.post_json(np, me), 'removed', to_jsonb(removed));
end $$;

-- ---------------------------------------------------------------- who may call what
do $$
declare f text;
begin
  foreach f in array array[
    'toggle_saved_post(uuid)', 'get_saved_posts(int, timestamptz, uuid)', 'hide_post(uuid)', 'report_content(text, text, text, text)',
    'delete_comment(bigint)', 'delete_notifications(bigint[])', 'delete_post(uuid)', 'my_photo_urls()',
    'update_post(uuid, text, text, text, integer, text[], text, boolean, text, text[])', 'get_feed(int, timestamptz, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
