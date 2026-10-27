-- Ghetto — profile page: bio + cover, username rules, profile read/edit, delete own post.

alter table public.profiles
  add column bio   text check (bio is null or char_length(bio) <= 160),
  add column cover text;                                   -- Unsplash photo id, null = default gradient
alter table public.profiles add constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$');
alter table public.profiles add constraint profiles_name_len check (char_length(name) between 1 and 40);

-- the demo user must not depend on the (now editable) username
create or replace function public.current_profile_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select '26de2ac9-cff0-4cd8-80db-90118d748616'::uuid $$;

-- comments also carry the author's profile id so a name/avatar can open the profile
create or replace function public.comment_json(c public.comments, p_me uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'pid', a.id,
    'name', case when a.id = p_me then 'You' else a.name end,
    'av', a.avatar,
    't', floor(extract(epoch from now() - c.created_at) / 60)::int,
    'likes', c.like_count,
    'liked', exists (select 1 from public.comment_likes l where l.comment_id = c.id and l.user_id = p_me),
    'mine', a.id = p_me,
    'text', c.body, 'open', false, 'replies', '[]'::jsonb)
  from public.profiles a where a.id = c.author_id
$$;

-- get_app_data keeps its old body (renamed, no longer public) and the new one adds the id -> username maps
alter function public.get_app_data() rename to get_app_data_core;
revoke execute on function public.get_app_data_core() from public, anon, authenticated;

create function public.get_app_data() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select c || jsonb_build_object(
    'me', (c -> 'me') || jsonb_build_object('handle', (select handle from public.profiles where id = public.current_profile_id())),
    'handles', (select coalesce(jsonb_object_agg(id, handle), '{}'::jsonb) from public.profiles),
    'storyHandles', (select coalesce(jsonb_object_agg(s.id, p.handle), '{}'::jsonb)
                     from public.stories s join public.profiles p on p.id = s.author_id))
  from (select public.get_app_data_core() as c) x
$$;

create function public.profile_people(p_ids uuid[], p_me uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'h', p.handle, 'n', p.name, 'av', p.avatar,
    'r', case when p.role = 'Landlord' then 'Landlord' else '' end,
    's', p.role || ' · ' || coalesce(p.headline, p.area, ''),
    'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = p.id),
    'me', p.id = p_me) order by p.name), '[]'::jsonb)
  from public.profiles p where p.id = any (p_ids)
$$;

create function public.get_profile(p_handle text default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); pr public.profiles;
begin
  if p_handle is null then select * into pr from public.profiles where id = me;
  else select * into pr from public.profiles where handle = lower(btrim(p_handle)); end if;
  if not found then return null; end if;
  return jsonb_build_object(
    'id', pr.id, 'handle', pr.handle, 'name', pr.name, 'role', pr.role, 'area', pr.area, 'bio', pr.bio,
    'avatar', pr.avatar, 'cover', pr.cover, 'verified', pr.verified,
    'joined', 'Joined ' || public.ago_long(pr.joined_at), 'isMe', pr.id = me,
    'linked', exists (select 1 from public.links k where k.follower_id = me and k.followee_id = pr.id),
    'posts', (select count(*) from public.posts where author_id = pr.id),
    'links', (select count(*) from public.links where followee_id = pr.id),
    'linking', (select count(*) from public.links where follower_id = pr.id),
    'linksList', public.profile_people(coalesce((select array_agg(follower_id) from public.links where followee_id = pr.id), '{}'), me),
    'linkingList', public.profile_people(coalesce((select array_agg(followee_id) from public.links where follower_id = pr.id), '{}'), me));
end $$;

create function public.update_profile(p_name text, p_handle text, p_bio text, p_area text, p_role text, p_avatar text, p_cover text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := public.current_profile_id();
  n text := btrim(coalesce(p_name, '')); h text := lower(btrim(coalesce(p_handle, '')));
  b text := nullif(btrim(coalesce(p_bio, '')), ''); a text := nullif(btrim(coalesce(p_area, '')), '');
  cv text := nullif(btrim(coalesce(p_cover, '')), '');
begin
  if char_length(n) < 1 or char_length(n) > 40 then raise exception 'Name must be 1 to 40 characters'; end if;
  if h !~ '^[a-z0-9_]{3,20}$' then raise exception 'Username must be 3 to 20 letters, numbers or underscores'; end if;
  if b is not null and char_length(b) > 160 then raise exception 'Bio can be up to 160 characters'; end if;
  if a is not null and char_length(a) > 40 then raise exception 'Place is too long'; end if;
  if p_role not in ('Student', 'Landlord') then raise exception 'Role must be Student or Landlord'; end if;
  if p_avatar !~ '^photo-[0-9a-z-]{6,40}$' then raise exception 'Invalid photo'; end if;
  if cv is not null and cv !~ '^photo-[0-9a-z-]{6,40}$' then raise exception 'Invalid cover'; end if;
  if exists (select 1 from public.profiles where handle = h and id <> me) then raise exception 'That username is taken'; end if;
  update public.profiles set name = n, handle = h, bio = b, area = a, role = p_role, avatar = p_avatar, cover = cv where id = me;
  return public.get_profile(h);
end $$;

create function public.delete_post(p_post uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id();
begin
  delete from public.posts where id = p_post and author_id = me;
  if not found then raise exception 'You can only delete your own posts'; end if;
  return jsonb_build_object('deleted', true);
end $$;

revoke execute on function public.profile_people(uuid[], uuid) from public, anon, authenticated;
revoke execute on function public.get_app_data(), public.get_profile(text), public.update_profile(text, text, text, text, text, text, text),
  public.delete_post(uuid) from public, anon, authenticated;
grant execute on function public.get_app_data(), public.get_profile(text), public.update_profile(text, text, text, text, text, text, text),
  public.delete_post(uuid) to anon, authenticated;
