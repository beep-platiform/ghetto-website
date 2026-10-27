-- Ghetto — initial schema.
--
-- Security model (no login page yet):
--   * every table has RLS enabled and NO policies, so the public (anon) API cannot read or write tables directly;
--   * the app talks to the database only through the SECURITY DEFINER functions at the bottom of this file;
--   * every write is done "as" the demo user (handle = 'emmanuel') via public.current_profile_id().
--     When real authentication is added, change that one function to return the profile that belongs to auth.uid().

-- ───────────────────────── tables ─────────────────────────
create table public.profiles (
  id          uuid primary key default gen_random_uuid(),
  handle      text not null unique,
  name        text not null,
  role        text not null default 'Student' check (role in ('Student', 'Landlord')),
  area        text,
  headline    text,
  avatar      text not null,                       -- Unsplash photo id
  verified    boolean not null default false,
  search_rank int,                                  -- order in "who to link with" / search; null = not suggested
  reply_time  text,                                 -- landlords: "within 1 hour"
  joined_at   timestamptz not null default now()
);

create table public.stories (
  id         text primary key,
  author_id  uuid references public.profiles (id) on delete set null,
  name       text not null,
  label      text not null,
  ring_photo text not null,
  ring_query text not null default 'w=160&h=160&fit=crop&crop=faces',
  rank       int not null,
  created_at timestamptz not null default now()
);

create table public.story_slides (
  id       bigint generated always as identity primary key,
  story_id text not null references public.stories (id) on delete cascade,
  position int not null,
  bg       text not null,
  badge    text not null,
  title    text not null,
  price    text not null,
  unit     text not null default '',
  location text not null
);
create index story_slides_story_idx on public.story_slides (story_id, position);

create table public.posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('featured', 'compact')),
  title       text not null check (char_length(title) between 1 and 140),
  subtitle    text,
  body        text not null check (char_length(body) between 1 and 2000),
  category    text,
  location    text,
  tag         text,
  photos      text[] not null default '{}',        -- Unsplash photo ids
  photo_total int not null default 0,
  more_count  int not null default 0,
  sign        text,
  like_count  int not null default 0 check (like_count >= 0),
  share_count int not null default 0,
  created_at  timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);

create table public.post_likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id         bigint generated always as identity primary key,
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  parent_id  bigint references public.comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 300),
  like_count int not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id);
create index comments_parent_idx on public.comments (parent_id);

create table public.comment_likes (
  comment_id bigint not null references public.comments (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table public.links (                          -- "Link" / "Linked" (follow)
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id)
);
create index links_followee_idx on public.links (followee_id);

create table public.notifications (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  actor_id       uuid references public.profiles (id) on delete set null,
  kind           text not null check (kind in ('like', 'comment', 'follow', 'house', 'mention', 'price')),
  html           text not null,                    -- written by the server only (anon cannot insert)
  quote          text,
  post_id        uuid references public.posts (id) on delete set null,
  opens_comments boolean not null default false,
  grp            text not null default 'Earlier' check (grp in ('New', 'Earlier')),
  read           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.trending_topics (
  id          int generated always as identity primary key,
  label       text not null,
  posts_count int not null default 0,
  query       text not null,
  rank        int not null
);

create table public.rooms (
  id             text primary key,
  landlord_id    uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  type           text not null check (type in ('single', 'shared', 'house', 'apartment')),
  area           text not null,
  km             numeric(4, 1) not null,
  price          int not null check (price >= 0),
  beds           int not null default 1,
  bath           text not null default 'Shared',
  facilities     text[] not null default '{}',
  rating         numeric(2, 1) not null default 0,
  review_count   int not null default 0,
  available_from date not null default current_date,
  deposit        text,
  min_stay       text,
  photos         text[] not null default '{}',
  about          text not null default '',
  rank           int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.room_reviews (
  id         bigint generated always as identity primary key,
  room_id    text not null references public.rooms (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  body       text not null,
  created_at timestamptz not null default now()
);
create index room_reviews_room_idx on public.room_reviews (room_id);

create table public.saved_rooms (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  room_id    text not null references public.rooms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, room_id)
);

create table public.room_messages (
  id           bigint generated always as identity primary key,
  room_id      text not null references public.rooms (id) on delete cascade,
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now()
);

create table public.visit_requests (
  id         bigint generated always as identity primary key,
  room_id    text not null references public.rooms (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  visit_date date not null,
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- Lock every table: RLS on, no policies, no direct grants for the public API roles.
do $$
declare t text;
begin
  foreach t in array array['profiles','stories','story_slides','posts','post_likes','comments','comment_likes','links',
                           'notifications','trending_topics','rooms','room_reviews','saved_rooms','room_messages','visit_requests']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ───────────────────────── helpers (not callable from the API) ─────────────────────────
create function public.current_profile_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.profiles where handle = 'emmanuel' $$;

create function public.ago_short(t timestamptz) returns text
language sql stable set search_path = ''
as $$
  select case
    when now() - t < interval '1 minute' then 'Just now'
    when now() - t < interval '1 hour'   then floor(extract(epoch from now() - t) / 60)::int  || 'm'
    when now() - t < interval '1 day'    then floor(extract(epoch from now() - t) / 3600)::int || 'h'
    else floor(extract(epoch from now() - t) / 86400)::int || 'd'
  end
$$;

create function public.ago_long(t timestamptz) returns text
language sql stable set search_path = ''
as $$
  select case
    when now() - t < interval '1 day'    then 'Today'
    when now() - t < interval '7 days'   then floor(extract(epoch from now() - t) / 86400)::int || ' days ago'
    when now() - t < interval '30 days'  then floor(extract(epoch from now() - t) / 604800)::int || ' week' || (case when floor(extract(epoch from now() - t) / 604800)::int = 1 then '' else 's' end) || ' ago'
    when now() - t < interval '365 days' then floor(extract(epoch from now() - t) / 2592000)::int || ' month' || (case when floor(extract(epoch from now() - t) / 2592000)::int = 1 then '' else 's' end) || ' ago'
    else floor(extract(epoch from now() - t) / 31536000)::int || ' year' || (case when floor(extract(epoch from now() - t) / 31536000)::int = 1 then '' else 's' end) || ' ago'
  end
$$;

create function public.comment_json(c public.comments, p_me uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'name', case when a.id = p_me then 'You' else a.name end,
    'av', a.avatar,
    't', floor(extract(epoch from now() - c.created_at) / 60)::int,
    'likes', c.like_count,
    'liked', exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = p_me),
    'mine', a.id = p_me,
    'text', c.body,
    'open', false,
    'replies', '[]'::jsonb)
  from public.profiles a where a.id = c.author_id
$$;

create function public.comment_tree(p_post uuid, p_me uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.comment_json(c, p_me) || jsonb_build_object('replies', (
      select coalesce(jsonb_agg(public.comment_json(r, p_me) order by r.id), '[]'::jsonb)
      from public.comments r where r.parent_id = c.id))
    order by c.id), '[]'::jsonb)
  from public.comments c where c.post_id = p_post and c.parent_id is null
$$;

create function public.post_json(p public.posts, p_me uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'title', p.title, 'subtitle', p.subtitle, 'body', p.body,
    'category', p.category, 'location', p.location, 'tag', p.tag,
    'photos', to_jsonb(p.photos), 'photoTotal', p.photo_total, 'moreCount', p.more_count, 'sign', p.sign,
    'likes', p.like_count, 'shares', p.share_count,
    'liked', exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = p_me),
    'ago', public.ago_short(p.created_at), 'createdAt', p.created_at,
    'author', jsonb_build_object('id', a.id, 'name', a.name, 'role', a.role, 'avatar', a.avatar, 'verified', a.verified,
                                 'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a.id)))
  from public.profiles a where a.id = p.author_id
$$;

revoke execute on function public.current_profile_id(), public.ago_short(timestamptz), public.ago_long(timestamptz),
  public.comment_json(public.comments, uuid), public.comment_tree(uuid, uuid), public.post_json(public.posts, uuid)
  from public, anon, authenticated;

-- ───────────────────────── API: read everything the app needs in one call ─────────────────────────
create function public.get_app_data() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := public.current_profile_id();
begin
  return jsonb_build_object(
    'today', current_date,
    'me', (select jsonb_build_object('id', p.id, 'name', p.name, 'avatar', p.avatar, 'role', p.role, 'area', p.area)
           from public.profiles p where p.id = me),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'label', s.label, 'photo', s.ring_photo, 'query', s.ring_query,
        'time', public.ago_short(s.created_at),
        'slides', (select coalesce(jsonb_agg(jsonb_build_object('bg', sl.bg, 'badge', sl.badge, 'title', sl.title,
                          'price', sl.price, 'unit', sl.unit, 'loc', sl.location) order by sl.position), '[]'::jsonb)
                   from public.story_slides sl where sl.story_id = s.id)) order by s.rank)
      from public.stories s), '[]'::jsonb),
    'posts', coalesce((select jsonb_agg(public.post_json(p, me) order by p.created_at desc) from public.posts p), '[]'::jsonb),
    'comments', coalesce((select jsonb_object_agg(p.id, public.comment_tree(p.id, me)) from public.posts p), '{}'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'n', p.name, 'r', case when p.role = 'Landlord' then 'Landlord' else '' end,
        'av', p.avatar, 's', p.role || ' · ' || coalesce(p.headline, p.area, ''),
        'linked', exists (select 1 from public.links k where k.follower_id = me and k.followee_id = p.id)) order by p.search_rank)
      from public.profiles p where p.search_rank is not null), '[]'::jsonb),
    'trending', coalesce((
      select jsonb_agg(jsonb_build_array(t.label, t.posts_count || ' posts', t.query) order by t.rank)
      from public.trending_topics t), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id::text, 'g', n.grp, 't', n.kind, 'av', a.avatar, 'html', n.html, 'quote', n.quote,
        'time', public.ago_short(n.created_at), 'unread', not n.read, 'post', n.post_id, 'cm', n.opens_comments,
        'fb', n.kind = 'follow', 'name', a.name, 'actor', a.id,
        'linked', exists (select 1 from public.links k where k.follower_id = me and k.followee_id = a.id))
        order by n.created_at desc)
      from public.notifications n left join public.profiles a on a.id = n.actor_id where n.user_id = me), '[]'::jsonb),
    'rooms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'title', r.title, 'type', r.type, 'area', r.area, 'km', r.km, 'price', r.price, 'beds', r.beds,
        'bath', r.bath, 'fac', to_jsonb(r.facilities), 'llk', l.handle,
        'll', jsonb_build_object('name', l.name, 'av', l.avatar, 'ver', l.verified,
                                 'joined', 'Joined ' || public.ago_long(l.joined_at), 'reply', coalesce(l.reply_time, 'within a day'),
                                 'id', l.id),
        'rate', r.rating, 'rev', r.review_count, 'from', r.available_from, 'dep', r.deposit, 'min', r.min_stay,
        'photos', to_jsonb(r.photos), 'about', r.about,
        'saved', exists (select 1 from public.saved_rooms sr where sr.room_id = r.id and sr.user_id = me),
        'reviews', (select coalesce(jsonb_agg(jsonb_build_object('name', ra.name, 'av', ra.avatar, 'text', rv.body,
                            'rate', rv.rating, 'when', public.ago_long(rv.created_at)) order by rv.created_at desc), '[]'::jsonb)
                    from public.room_reviews rv join public.profiles ra on ra.id = rv.author_id where rv.room_id = r.id))
        order by r.rank)
      from public.rooms r join public.profiles l on l.id = r.landlord_id), '[]'::jsonb)
  );
end $$;

-- ───────────────────────── API: writes (all validated here) ─────────────────────────
create function public.toggle_post_like(p_post uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); liked boolean; n int;
begin
  if exists (select 1 from public.post_likes where post_id = p_post and user_id = me) then
    delete from public.post_likes where post_id = p_post and user_id = me;
    update public.posts set like_count = greatest(like_count - 1, 0) where id = p_post returning like_count into n;
    liked := false;
  else
    insert into public.post_likes (post_id, user_id) values (p_post, me);
    update public.posts set like_count = like_count + 1 where id = p_post returning like_count into n;
    liked := true;
  end if;
  return jsonb_build_object('liked', liked, 'likes', n);
end $$;

create function public.add_comment(p_post uuid, p_parent bigint, p_body text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); b text := btrim(coalesce(p_body, '')); root bigint; new_id bigint; ts timestamptz;
begin
  if char_length(b) < 1 or char_length(b) > 300 then raise exception 'Comment must be 1 to 300 characters'; end if;
  if not exists (select 1 from public.posts where id = p_post) then raise exception 'Post not found'; end if;
  if p_parent is not null then
    select coalesce(c.parent_id, c.id) into root from public.comments c where c.id = p_parent and c.post_id = p_post;
    if root is null then raise exception 'Parent comment not found'; end if;
  end if;
  insert into public.comments (post_id, author_id, parent_id, body) values (p_post, me, root, b)
    returning id, created_at into new_id, ts;
  return jsonb_build_object('id', new_id, 'createdAt', ts);
end $$;

create function public.toggle_comment_like(p_comment bigint) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); liked boolean; n int;
begin
  if exists (select 1 from public.comment_likes where comment_id = p_comment and user_id = me) then
    delete from public.comment_likes where comment_id = p_comment and user_id = me;
    update public.comments set like_count = greatest(like_count - 1, 0) where id = p_comment returning like_count into n;
    liked := false;
  else
    insert into public.comment_likes (comment_id, user_id) values (p_comment, me);
    update public.comments set like_count = like_count + 1 where id = p_comment returning like_count into n;
    liked := true;
  end if;
  return jsonb_build_object('liked', liked, 'likes', n);
end $$;

create function public.toggle_link(p_profile uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); linked boolean;
begin
  if not exists (select 1 from public.profiles where id = p_profile) then raise exception 'Profile not found'; end if;
  if exists (select 1 from public.links where follower_id = me and followee_id = p_profile) then
    delete from public.links where follower_id = me and followee_id = p_profile; linked := false;
  else
    insert into public.links (follower_id, followee_id) values (me, p_profile); linked := true;
  end if;
  return jsonb_build_object('linked', linked);
end $$;

create function public.mark_notification_read(p_id bigint) returns void
language sql security definer set search_path = ''
as $$ update public.notifications set read = true where id = p_id and user_id = public.current_profile_id() $$;

create function public.mark_all_notifications_read() returns void
language sql security definer set search_path = ''
as $$ update public.notifications set read = true where user_id = public.current_profile_id() and not read $$;

create function public.toggle_saved_room(p_room text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); saved boolean;
begin
  if not exists (select 1 from public.rooms where id = p_room) then raise exception 'Room not found'; end if;
  if exists (select 1 from public.saved_rooms where user_id = me and room_id = p_room) then
    delete from public.saved_rooms where user_id = me and room_id = p_room; saved := false;
  else
    insert into public.saved_rooms (user_id, room_id) values (me, p_room); saved := true;
  end if;
  return jsonb_build_object('saved', saved);
end $$;

create function public.send_room_message(p_room text, p_body text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); b text := btrim(coalesce(p_body, '')); owner uuid; new_id bigint;
begin
  if char_length(b) < 1 or char_length(b) > 500 then raise exception 'Message must be 1 to 500 characters'; end if;
  select landlord_id into owner from public.rooms where id = p_room;
  if owner is null then raise exception 'Room not found'; end if;
  insert into public.room_messages (room_id, sender_id, recipient_id, body) values (p_room, me, owner, b) returning id into new_id;
  return jsonb_build_object('id', new_id);
end $$;

create function public.request_room_visit(p_room text, p_date date) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); new_id bigint;
begin
  if not exists (select 1 from public.rooms where id = p_room) then raise exception 'Room not found'; end if;
  if p_date is null or p_date < current_date then raise exception 'Pick a date from today onwards'; end if;
  insert into public.visit_requests (room_id, user_id, visit_date) values (p_room, me, p_date) returning id into new_id;
  return jsonb_build_object('id', new_id);
end $$;

create function public.create_post(p_title text, p_body text, p_location text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := public.current_profile_id();
  t text := btrim(coalesce(p_title, '')); b text := btrim(coalesce(p_body, '')); loc text := nullif(btrim(coalesce(p_location, '')), '');
  k text; np public.posts;
begin
  if char_length(t) < 1 or char_length(t) > 140 then raise exception 'Title must be 1 to 140 characters'; end if;
  if char_length(b) < 1 or char_length(b) > 2000 then raise exception 'Text must be 1 to 2000 characters'; end if;
  if loc is not null and char_length(loc) > 60 then raise exception 'Location is too long'; end if;
  -- alternate the look (orange / white) like the rest of the feed
  select case when kind = 'featured' then 'compact' else 'featured' end into k from public.posts order by created_at desc limit 1;
  insert into public.posts (author_id, kind, title, body, location) values (me, coalesce(k, 'featured'), t, b, loc) returning * into np;
  return public.post_json(np, me);
end $$;

revoke execute on function
  public.get_app_data(), public.toggle_post_like(uuid), public.add_comment(uuid, bigint, text), public.toggle_comment_like(bigint),
  public.toggle_link(uuid), public.mark_notification_read(bigint), public.mark_all_notifications_read(), public.toggle_saved_room(text),
  public.send_room_message(text, text), public.request_room_visit(text, date), public.create_post(text, text, text)
  from public, anon, authenticated;
grant execute on function
  public.get_app_data(), public.toggle_post_like(uuid), public.add_comment(uuid, bigint, text), public.toggle_comment_like(bigint),
  public.toggle_link(uuid), public.mark_notification_read(bigint), public.mark_all_notifications_read(), public.toggle_saved_room(text),
  public.send_room_message(text, text), public.request_room_visit(text, date), public.create_post(text, text, text)
  to anon, authenticated;
