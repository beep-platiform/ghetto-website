-- 0006: the Create page. Photo storage (small, compressed), post type / price / topics / audience / comments switch / alt text.

-- ---------------------------------------------------------------- storage: one public bucket, hard size cap, own folder only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 307200, array['image/webp', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 307200, allowed_mime_types = array['image/webp', 'image/jpeg'];

-- (run once: if you re-run this file, remove the two policies first, they have no 'if not exists')
-- people may add files only inside a folder named after their own login id, and remove only their own files.
-- (Public files are served by URL, so no read/list policy is needed: nobody can list the bucket.)
create policy "post images: upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "post images: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------- post fields
alter table public.posts
  add column if not exists post_type   text    not null default 'tip' check (post_type in ('room', 'tip', 'price', 'question', 'event')),
  add column if not exists price       integer check (price is null or price between 0 and 100000000),
  add column if not exists tags        text[]  not null default '{}',
  add column if not exists audience    text    not null default 'everyone' check (audience in ('everyone', 'links')),
  add column if not exists comments_on boolean not null default true,
  add column if not exists alt         text    check (alt is null or char_length(alt) <= 200);

-- who may see one post: the author's profile rules + the post's own audience ("links" = people who link with the author)
create or replace function public.can_see_post(p public.posts, p_viewer uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_see_profile(p.author_id, p_viewer)
     and (p.audience = 'everyone' or p.author_id = p_viewer
          or exists (select 1 from public.links k where k.follower_id = p_viewer and k.followee_id = p.author_id))
$$;

create or replace function public.post_json(p public.posts, p_me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'title', p.title, 'subtitle', p.subtitle, 'body', p.body,
    'category', p.category, 'location', p.location, 'tag', p.tag,
    'photos', to_jsonb(p.photos), 'photoTotal', p.photo_total, 'moreCount', p.more_count, 'sign', p.sign,
    'type', p.post_type, 'price', p.price, 'tags', to_jsonb(p.tags), 'audience', p.audience, 'commentsOn', p.comments_on, 'alt', p.alt,
    'likes', p.like_count, 'shares', p.share_count,
    'liked', exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = p_me),
    'ago', public.ago_short(p.created_at), 'createdAt', p.created_at,
    'cmtCount', (select count(*) from public.comments c where c.post_id = p.id),
    'top', (select jsonb_build_object('name', ca.name, 'av', ca.avatar, 'text', c.body, 'likes', c.like_count)
            from public.comments c join public.profiles ca on ca.id = c.author_id
            where c.post_id = p.id and c.parent_id is null order by c.like_count desc, c.id limit 1),
    'author', jsonb_build_object('id', a.id, 'name', a.name, 'role', a.role, 'avatar', a.avatar, 'verified', a.verified,
                                 'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a.id)))
  from public.profiles a where a.id = p.author_id
$$;

-- ---------------------------------------------------------------- create a post
create or replace function public.create_post(
  p_title text, p_body text, p_location text default null, p_type text default 'tip', p_photos text[] default '{}',
  p_price integer default null, p_tags text[] default '{}', p_audience text default 'everyone',
  p_comments boolean default true, p_alt text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := public.current_profile_id(); uid uuid := auth.uid();
  t text := btrim(coalesce(p_title, '')); b text := btrim(coalesce(p_body, '')); loc text := nullif(btrim(coalesce(p_location, '')), '');
  ty text := coalesce(p_type, 'tip'); ph text[] := coalesce(p_photos, '{}'); u text; tg text[] := '{}'; x text;
  pr integer := p_price; k text; kw text; np public.posts; folder text;
begin
  if me is null or uid is null then raise exception 'Please log in'; end if;
  if char_length(t) < 1 or char_length(t) > 140 then raise exception 'Title must be 1 to 140 characters'; end if;
  if char_length(b) < 1 or char_length(b) > 2000 then raise exception 'Text must be 1 to 2000 characters'; end if;
  if loc is not null and char_length(loc) > 60 then raise exception 'Location is too long'; end if;
  if ty not in ('room', 'tip', 'price', 'question', 'event') then raise exception 'Unknown post type'; end if;
  if coalesce(p_audience, 'everyone') not in ('everyone', 'links') then raise exception 'Unknown audience'; end if;
  if p_alt is not null and char_length(p_alt) > 200 then raise exception 'Photo description is too long'; end if;
  if cardinality(ph) > 6 then raise exception 'Up to 6 photos'; end if;
  -- photos must be files this person uploaded to the post-images bucket
  folder := '/storage/v1/object/public/post-images/' || uid::text || '/';
  foreach u in array ph loop
    if u is null or u not like 'https://%' or position(folder in u) = 0 or char_length(u) > 400 then raise exception 'Invalid photo'; end if;
  end loop;
  -- topics: letters, numbers, underscore; up to 5, no repeats
  foreach x in array coalesce(p_tags, '{}') loop
    x := lower(regexp_replace(coalesce(x, ''), '[^A-Za-z0-9_]', '', 'g'));
    if char_length(x) between 2 and 24 and not (x = any (tg)) and cardinality(tg) < 5 then tg := tg || x; end if;
  end loop;
  if ty not in ('room', 'price') then pr := null; end if;
  kw := case ty when 'room' then 'room housing campus landlord' when 'price' then 'price market food' when 'question' then 'question help'
                when 'event' then 'event campus' else 'tip guide campus' end;
  -- alternate the look (orange / white) like the rest of the feed
  select case when kind = 'featured' then 'compact' else 'featured' end into k from public.posts order by created_at desc limit 1;
  insert into public.posts (author_id, kind, title, body, location, category, tag, photos, photo_total, more_count, sign,
                            post_type, price, tags, audience, comments_on, alt)
  values (me, coalesce(k, 'featured'), t, b, loc, btrim(kw || ' ' || array_to_string(tg, ' ')), case when ty = 'room' then 'New' end,
          ph, cardinality(ph), greatest(cardinality(ph) - 3, 0),
          case when pr is not null then to_char(pr, 'FM999,999,999') || ' RWF' end,
          ty, pr, tg, coalesce(p_audience, 'everyone'), coalesce(p_comments, true), nullif(btrim(coalesce(p_alt, '')), ''))
  returning * into np;
  return public.post_json(np, me);
end $$;

-- ---------------------------------------------------------------- reading + commenting respect the audience / comment switch
create or replace function public.get_feed(p_limit int default 8, p_ts timestamptz default null, p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 8), 1), 30);
        items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  with pg as (
    select row_number() over (order by p.created_at desc, p.id desc)::int rn, p.id, p.created_at from public.posts p
    where public.can_see_post(p, me) and (p_ts is null or (p.created_at, p.id) < (p_ts, p_id))
    order by p.created_at desc, p.id desc limit lim + 1)
  select coalesce(jsonb_agg(public.post_json(po, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.created_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid from pg join public.posts po on po.id = pg.id;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('posts', items, 'next', nxt);
end $$;

create or replace function public.get_user_posts(p_profile uuid, p_limit int default 8, p_ts timestamptz default null, p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 8), 1), 30);
        items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  if not public.can_see_profile(p_profile, me) then return jsonb_build_object('posts', '[]'::jsonb, 'next', null); end if;
  with pg as (
    select row_number() over (order by p.created_at desc, p.id desc)::int rn, p.id, p.created_at from public.posts p
    where p.author_id = p_profile and public.can_see_post(p, me) and (p_ts is null or (p.created_at, p.id) < (p_ts, p_id))
    order by p.created_at desc, p.id desc limit lim + 1)
  select coalesce(jsonb_agg(public.post_json(po, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.created_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid from pg join public.posts po on po.id = pg.id;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('posts', items, 'next', nxt);
end $$;

create or replace function public.get_post(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); po public.posts;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into po from public.posts where id = p_post;
  if po.id is null or not public.can_see_post(po, me) then return null; end if;
  return public.post_json(po, me);
end $$;

create or replace function public.get_comments(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); po public.posts;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into po from public.posts where id = p_post;
  if po.id is null or not public.can_see_post(po, me) then return '[]'::jsonb; end if;
  return public.comment_tree(p_post, me);
end $$;

create or replace function public.add_comment(p_post uuid, p_parent bigint, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); b text := btrim(coalesce(p_body, '')); root bigint; new_id bigint; ts timestamptz; po public.posts;
begin
  if me is null then raise exception 'Please log in'; end if;
  if char_length(b) < 1 or char_length(b) > 300 then raise exception 'Comment must be 1 to 300 characters'; end if;
  select * into po from public.posts where id = p_post;
  if po.id is null or not public.can_see_post(po, me) then raise exception 'Post not found'; end if;
  if not po.comments_on then raise exception 'Comments are turned off for this post'; end if;
  if p_parent is not null then
    select coalesce(c.parent_id, c.id) into root from public.comments c where c.id = p_parent and c.post_id = p_post;
    if root is null then raise exception 'Parent comment not found'; end if;
  end if;
  insert into public.comments (post_id, author_id, parent_id, body) values (p_post, me, root, b) returning id, created_at into new_id, ts;
  return jsonb_build_object('id', new_id, 'createdAt', ts);
end $$;

-- ---------------------------------------------------------------- who may call what
-- (the old 3-argument create_post is left in place but nobody can call it any more)
revoke all on function public.create_post(text, text, text) from public, anon, authenticated;
revoke all on function public.can_see_post(public.posts, uuid) from public, anon, authenticated;
revoke all on function public.post_json(public.posts, uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'create_post(text, text, text, text, text[], integer, text[], text, boolean, text)', 'get_feed(int, timestamptz, uuid)',
    'get_user_posts(uuid, int, timestamptz, uuid)', 'get_post(uuid)', 'get_comments(uuid)', 'add_comment(uuid, bigint, text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
