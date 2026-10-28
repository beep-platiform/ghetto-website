-- 0004: live notifications (made by what people do), grouped "while you were away" digest, and cursor paging.
-- Everything is a SECURITY DEFINER function, like the rest of the app (tables stay closed to the browser).

create or replace function public.esc_html(t text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

create index if not exists notifications_user_created on public.notifications (user_id, created_at desc, id desc);
create index if not exists posts_created on public.posts (created_at desc, id desc);
create index if not exists comments_post on public.comments (post_id);

-- ---------------------------------------------------------------- triggers: a task done -> a notification
create or replace function public.notify_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; nm text;
begin
  select author_id into owner from public.posts where id = new.post_id;
  if owner is null or owner = new.user_id then return new; end if;
  if exists (select 1 from public.notifications where user_id = owner and actor_id = new.user_id
             and post_id = new.post_id and kind = 'like' and not opens_comments) then return new; end if;
  select name into nm from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, actor_id, kind, html, post_id, opens_comments, grp)
  values (owner, new.user_id, 'like', '<b>' || public.esc_html(nm) || '</b> liked your post', new.post_id, false, 'New');
  return new;
end $$;

create or replace function public.unnotify_post_like() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where actor_id = old.user_id and post_id = old.post_id
    and kind = 'like' and not opens_comments and user_id = (select author_id from public.posts where id = old.post_id);
  return old;
end $$;

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; pc uuid; nm text; q text := left(new.body, 140);
begin
  select author_id into owner from public.posts where id = new.post_id;
  select name into nm from public.profiles where id = new.author_id;
  if new.parent_id is not null then
    select author_id into pc from public.comments where id = new.parent_id;
    if pc is not null and pc <> new.author_id then
      insert into public.notifications (user_id, actor_id, kind, html, quote, post_id, opens_comments, grp)
      values (pc, new.author_id, 'comment', '<b>' || public.esc_html(nm) || '</b> replied to your comment', q, new.post_id, true, 'New');
    end if;
  end if;
  if owner is not null and owner <> new.author_id and owner is distinct from pc then
    insert into public.notifications (user_id, actor_id, kind, html, quote, post_id, opens_comments, grp)
    values (owner, new.author_id, 'comment', '<b>' || public.esc_html(nm) || '</b> commented on your post', q, new.post_id, true, 'New');
  end if;
  return new;
end $$;

create or replace function public.notify_comment_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid; pid uuid; body text; nm text;
begin
  select author_id, post_id, c.body into owner, pid, body from public.comments c where c.id = new.comment_id;
  if owner is null or owner = new.user_id then return new; end if;
  if exists (select 1 from public.notifications where user_id = owner and actor_id = new.user_id and post_id = pid
             and kind = 'like' and opens_comments and quote is not distinct from left(body, 140)) then return new; end if;
  select name into nm from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, actor_id, kind, html, quote, post_id, opens_comments, grp)
  values (owner, new.user_id, 'like', '<b>' || public.esc_html(nm) || '</b> liked your comment', left(body, 140), pid, true, 'New');
  return new;
end $$;

create or replace function public.notify_link() returns trigger
language plpgsql security definer set search_path = '' as $$
declare nm text;
begin
  if new.followee_id = new.follower_id then return new; end if;
  if exists (select 1 from public.notifications where user_id = new.followee_id and actor_id = new.follower_id and kind = 'follow') then return new; end if;
  select name into nm from public.profiles where id = new.follower_id;
  insert into public.notifications (user_id, actor_id, kind, html, grp)
  values (new.followee_id, new.follower_id, 'follow', '<b>' || public.esc_html(nm) || '</b> started linking with you', 'New');
  return new;
end $$;

create or replace function public.unnotify_link() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications where user_id = old.followee_id and actor_id = old.follower_id and kind = 'follow';
  return old;
end $$;

create or replace function public.notify_visit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare ll uuid; t text; nm text;
begin
  select landlord_id, title into ll, t from public.rooms where id = new.room_id;
  if ll is null or ll = new.user_id then return new; end if;
  select name into nm from public.profiles where id = new.user_id;
  insert into public.notifications (user_id, actor_id, kind, html, grp)
  values (ll, new.user_id, 'house', '<b>' || public.esc_html(nm) || '</b> wants to visit <b>' || public.esc_html(t) || '</b> on ' || to_char(new.visit_date, 'FMDD Mon'), 'New');
  return new;
end $$;

create or replace function public.notify_room_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t text; nm text;
begin
  if new.recipient_id is null or new.recipient_id = new.sender_id then return new; end if;
  select title into t from public.rooms where id = new.room_id;
  select name into nm from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, actor_id, kind, html, quote, grp)
  values (new.recipient_id, new.sender_id, 'house', '<b>' || public.esc_html(nm) || '</b> messaged you about <b>' || public.esc_html(coalesce(t, 'your room')) || '</b>', left(new.body, 140), 'New');
  return new;
end $$;

drop trigger if exists trg_notify_post_like on public.post_likes;
create trigger trg_notify_post_like after insert on public.post_likes for each row execute function public.notify_post_like();
drop trigger if exists trg_unnotify_post_like on public.post_likes;
create trigger trg_unnotify_post_like after delete on public.post_likes for each row execute function public.unnotify_post_like();
drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments for each row execute function public.notify_comment();
drop trigger if exists trg_notify_comment_like on public.comment_likes;
create trigger trg_notify_comment_like after insert on public.comment_likes for each row execute function public.notify_comment_like();
drop trigger if exists trg_notify_link on public.links;
create trigger trg_notify_link after insert on public.links for each row execute function public.notify_link();
drop trigger if exists trg_unnotify_link on public.links;
create trigger trg_unnotify_link after delete on public.links for each row execute function public.unnotify_link();
drop trigger if exists trg_notify_visit on public.visit_requests;
create trigger trg_notify_visit after insert on public.visit_requests for each row execute function public.notify_visit();
drop trigger if exists trg_notify_room_message on public.room_messages;
create trigger trg_notify_room_message after insert on public.room_messages for each row execute function public.notify_room_message();

-- ---------------------------------------------------------------- reading notifications
create or replace function public.notif_allowed(k text, s public.user_settings) returns boolean
language sql immutable set search_path = '' as $$
  select case k
    when 'like' then coalesce(s.notify_likes, true)
    when 'comment' then coalesce(s.notify_comments, true)
    when 'mention' then coalesce(s.notify_comments, true)
    when 'follow' then coalesce(s.notify_links, true)
    when 'house' then coalesce(s.notify_rooms, true)
    when 'price' then coalesce(s.notify_prices, true)
    else true end
$$;

-- one notification, as the page wants it
create or replace function public.notif_single(n public.notifications, p_me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', n.id::text, 'ids', jsonb_build_array(n.id), 'g', case when n.read then 'Earlier' else 'New' end, 't', n.kind,
    'av', a.avatar, 'html', n.html, 'quote', n.quote, 'time', public.ago_short(n.created_at), 'unread', not n.read,
    'post', n.post_id, 'cm', n.opens_comments, 'fb', n.kind = 'follow', 'name', a.name, 'actor', a.id, 'count', 1,
    'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a.id))
  from (select 1) o left join public.profiles a on a.id = n.actor_id
$$;

-- many alike notifications that arrived while you were away, as one line: "Aline, Emerson and 3 others liked your post"
create or replace function public.notif_group(rep public.notifications, p_cnt int, p_ts timestamptz, p_unread boolean,
                                              p_ids bigint[], p_actors uuid[], p_me uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare act uuid[]; n int; n1 text; n2 text; verb text; head text; a1 public.profiles;
begin
  select coalesce(array_agg(x order by o), '{}') into act
    from (select x, min(o) o from unnest(p_actors) with ordinality t(x, o) where x is not null group by x) d;
  n := cardinality(act);
  if n = 0 then return public.notif_single(rep, p_me) || jsonb_build_object('id', rep.id::text); end if;
  select * into a1 from public.profiles where id = act[1];
  select name into n1 from public.profiles where id = act[1];
  if n >= 2 then select name into n2 from public.profiles where id = act[2]; end if;
  verb := case when rep.kind = 'like' and rep.opens_comments then 'liked your comment'
               when rep.kind = 'like' then 'liked your post'
               when rep.html like '%replied to your comment%' then 'replied to your comment'
               else 'commented on your post' end;
  head := case when n = 1 then '<b>' || public.esc_html(n1) || '</b> ' || p_cnt || ' times'
               when n = 2 then '<b>' || public.esc_html(n1) || '</b> and <b>' || public.esc_html(n2) || '</b>'
               else '<b>' || public.esc_html(n1) || '</b>, <b>' || public.esc_html(n2) || '</b> and ' || (n - 2) || ' other' || case when n - 2 = 1 then '' else 's' end end;
  return jsonb_build_object(
    'id', rep.id::text, 'ids', to_jsonb(p_ids), 'g', case when p_unread then 'New' else 'Earlier' end, 't', rep.kind,
    'av', a1.avatar, 'html', case when n = 1 then '<b>' || public.esc_html(n1) || '</b> ' || verb || ' (' || p_cnt || ' times)' else head || ' ' || verb end,
    'quote', rep.quote, 'time', public.ago_short(p_ts), 'unread', p_unread, 'post', rep.post_id, 'cm', rep.opens_comments,
    'fb', false, 'name', n1, 'actor', a1.id, 'count', p_cnt, 'people', n,
    'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a1.id));
end $$;

create or replace function public.notif_unread(p_me uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.notifications n
  where n.user_id = p_me and not n.read
    and public.notif_allowed(n.kind, (select s from public.user_settings s where s.profile_id = p_me))
$$;

-- one page of notifications, newest first. Pass back `next` (ts + id) to get the following page: no repeats, nothing skipped.
-- Likes and comments older than `p_session` (the moment you opened the app) are combined per post; everything newer, and every link, stays single.
create or replace function public.get_notifications(p_limit int default 12, p_ts timestamptz default null, p_id bigint default null,
                                                    p_unread boolean default false, p_session timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); s public.user_settings; sess timestamptz := coalesce(p_session, now());
        lim int := least(greatest(coalesce(p_limit, 12), 1), 50); items jsonb; nxt jsonb; got int; lastts timestamptz; lastid bigint;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into s from public.user_settings where profile_id = me;
  with base as (
    select n.*, case when n.kind in ('like', 'comment') and n.created_at < sess
                     then n.kind || ':' || coalesce(n.post_id::text, '') || ':' || n.opens_comments::text || ':' || (n.html like '%replied to your comment%')::text
                     else 'i:' || n.id end gk
    from public.notifications n
    where n.user_id = me and (not p_unread or not n.read) and public.notif_allowed(n.kind, s)),
  g as (
    select gk, max(created_at) ts, max(id) mid, count(*)::int cnt, bool_or(not read) unread,
           array_agg(id order by created_at desc, id desc) ids, array_agg(actor_id order by created_at desc, id desc) actors
    from base group by gk),
  pg as (
    select row_number() over (order by ts desc, mid desc)::int rn, g.* from g
    where p_ts is null or (ts, mid) < (p_ts, p_id)
    order by ts desc, mid desc limit lim + 1)
  select coalesce(jsonb_agg(case when pg.cnt = 1 then public.notif_single(n, me)
                                 else public.notif_group(n, pg.cnt, pg.ts, pg.unread, pg.ids, pg.actors, me) end order by pg.rn)
                  filter (where pg.rn <= lim), '[]'::jsonb),
         count(*)::int,
         (array_agg(pg.ts order by pg.rn) filter (where pg.rn = lim))[1],
         (array_agg(pg.mid order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid
    from pg join public.notifications n on n.id = pg.mid;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('items', items, 'next', nxt, 'unread', public.notif_unread(me), 'session', sess,
                            'maxId', coalesce((select max(id) from public.notifications where user_id = me), 0));
end $$;

-- while the app is open: anything new since the last id you saw, each one on its own
create or replace function public.poll_notifications(p_after bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); s public.user_settings;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into s from public.user_settings where profile_id = me;
  return jsonb_build_object(
    'items', coalesce((select jsonb_agg(public.notif_single(n, me) order by n.created_at desc, n.id desc)
                       from public.notifications n where n.user_id = me and n.id > coalesce(p_after, 0) and public.notif_allowed(n.kind, s)), '[]'::jsonb),
    'unread', public.notif_unread(me),
    'maxId', coalesce((select max(id) from public.notifications where user_id = me), 0));
end $$;

create or replace function public.mark_notifications_read(p_ids bigint[]) returns int
language sql security definer set search_path = '' as $$
  with u as (update public.notifications set read = true where user_id = public.current_profile_id() and id = any (p_ids) and not read returning 1)
  select public.notif_unread(public.current_profile_id())
$$;

-- ---------------------------------------------------------------- posts: counts + top comment travel with the post; comments load when opened
create or replace function public.post_json(p public.posts, p_me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'kind', p.kind, 'title', p.title, 'subtitle', p.subtitle, 'body', p.body,
    'category', p.category, 'location', p.location, 'tag', p.tag,
    'photos', to_jsonb(p.photos), 'photoTotal', p.photo_total, 'moreCount', p.more_count, 'sign', p.sign,
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

create or replace function public.get_feed(p_limit int default 8, p_ts timestamptz default null, p_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 8), 1), 30);
        items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  with pg as (
    select row_number() over (order by p.created_at desc, p.id desc)::int rn, p.id, p.created_at from public.posts p
    where public.can_see_profile(p.author_id, me) and (p_ts is null or (p.created_at, p.id) < (p_ts, p_id))
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
    where p.author_id = p_profile and (p_ts is null or (p.created_at, p.id) < (p_ts, p_id))
    order by p.created_at desc, p.id desc limit lim + 1)
  select coalesce(jsonb_agg(public.post_json(po, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.created_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid from pg join public.posts po on po.id = pg.id;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('posts', items, 'next', nxt);
end $$;

create or replace function public.get_comments(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); a uuid;
begin
  if me is null then raise exception 'Please log in'; end if;
  select author_id into a from public.posts where id = p_post;
  if a is null or not public.can_see_profile(a, me) then return '[]'::jsonb; end if;
  return public.comment_tree(p_post, me);
end $$;

-- ---------------------------------------------------------------- rooms in pages
create or replace function public.room_json(r public.rooms, me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'title', r.title, 'type', r.type, 'area', r.area, 'km', r.km, 'price', r.price, 'beds', r.beds,
    'bath', r.bath, 'fac', to_jsonb(r.facilities), 'llk', l.handle,
    'll', jsonb_build_object('name', l.name, 'av', l.avatar, 'ver', l.verified,
                             'joined', 'Joined ' || public.ago_long(l.joined_at), 'reply', coalesce(l.reply_time, 'within a day'), 'id', l.id),
    'rate', r.rating, 'rev', r.review_count, 'from', r.available_from, 'dep', r.deposit, 'min', r.min_stay,
    'photos', to_jsonb(r.photos), 'about', r.about, 'rank', r.rank,
    'saved', exists (select 1 from public.saved_rooms sr where sr.room_id = r.id and sr.user_id = me),
    'reviews', (select coalesce(jsonb_agg(jsonb_build_object('name', ra.name, 'av', ra.avatar, 'text', rv.body,
                        'rate', rv.rating, 'when', public.ago_long(rv.created_at)) order by rv.created_at desc), '[]'::jsonb)
                from public.room_reviews rv join public.profiles ra on ra.id = rv.author_id where rv.room_id = r.id))
  from public.profiles l where l.id = r.landlord_id
$$;

create or replace function public.get_rooms(p_limit int default 6, p_after int default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 6), 1), 30);
        items jsonb; got int; lastrank int; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  with pg as (select row_number() over (order by r.rank)::int rn, r.id, r.rank from public.rooms r where p_after is null or r.rank > p_after order by r.rank limit lim + 1)
  select coalesce(jsonb_agg(public.room_json(ro, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.rank order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastrank from pg join public.rooms ro on ro.id = pg.id;
  if got > lim then nxt := jsonb_build_object('after', lastrank); end if;
  return jsonb_build_object('rooms', items, 'next', nxt);
end $$;

-- ---------------------------------------------------------------- the first screen: only the first page of everything
drop function if exists public.get_app_data();
drop function if exists public.get_app_data_core();
create function public.get_app_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  return jsonb_build_object(
    'today', current_date,
    'me', (select jsonb_build_object('id', p.id, 'name', p.name, 'avatar', p.avatar, 'role', p.role, 'area', p.area, 'handle', p.handle)
           from public.profiles p where p.id = me),
    'stories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'label', s.label, 'photo', s.ring_photo, 'query', s.ring_query,
        'time', public.ago_short(s.created_at),
        'slides', (select coalesce(jsonb_agg(jsonb_build_object('bg', sl.bg, 'badge', sl.badge, 'title', sl.title,
                          'price', sl.price, 'unit', sl.unit, 'loc', sl.location) order by sl.position), '[]'::jsonb)
                   from public.story_slides sl where sl.story_id = s.id)) order by s.rank)
      from public.stories s), '[]'::jsonb),
    'feed', public.get_feed(8, null, null),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'n', p.name, 'r', case when p.role = 'Landlord' then 'Landlord' else '' end,
        'av', p.avatar, 's', p.role || ' · ' || coalesce(p.headline, p.area, ''),
        'linked', exists (select 1 from public.links k where k.follower_id = me and k.followee_id = p.id)) order by p.search_rank)
      from public.profiles p where p.search_rank is not null), '[]'::jsonb),
    'trending', coalesce((select jsonb_agg(jsonb_build_array(t.label, t.posts_count || ' posts', t.query) order by t.rank) from public.trending_topics t), '[]'::jsonb),
    'notifs', public.get_notifications(10, null, null, false, null),
    'rooms', public.get_rooms(6, null),
    'handles', (select coalesce(jsonb_object_agg(id, handle), '{}'::jsonb) from public.profiles),
    'storyHandles', (select coalesce(jsonb_object_agg(st.id, p.handle), '{}'::jsonb) from public.stories st join public.profiles p on p.id = st.author_id));
end $$;

-- ---------------------------------------------------------------- who may call what
do $$
declare f text;
begin
  foreach f in array array[
    'esc_html(text)', 'notif_allowed(text, public.user_settings)', 'notif_single(public.notifications, uuid)',
    'notif_group(public.notifications, int, timestamptz, boolean, bigint[], uuid[], uuid)', 'notif_unread(uuid)',
    'room_json(public.rooms, uuid)', 'post_json(public.posts, uuid)',
    'notify_post_like()', 'unnotify_post_like()', 'notify_comment()', 'notify_comment_like()', 'notify_link()', 'unnotify_link()',
    'notify_visit()', 'notify_room_message()']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
  end loop;
  foreach f in array array[
    'get_notifications(int, timestamptz, bigint, boolean, timestamptz)', 'poll_notifications(bigint)', 'mark_notifications_read(bigint[])',
    'get_feed(int, timestamptz, uuid)', 'get_user_posts(uuid, int, timestamptz, uuid)', 'get_comments(uuid)', 'get_rooms(int, int)', 'get_app_data()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
