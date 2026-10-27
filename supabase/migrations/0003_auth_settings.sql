-- Ghetto — real accounts (Supabase Auth) + per-user settings.

-- every profile can belong to one auth user (the demo profiles have none)
alter table public.profiles add column auth_id uuid unique references auth.users (id) on delete cascade;

-- the signed-in user's profile (null when nobody is signed in)
create or replace function public.current_profile_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.profiles where auth_id = auth.uid() $$;

-- ───────────────────────── settings ─────────────────────────
create table public.user_settings (
  profile_id       uuid primary key references public.profiles (id) on delete cascade,
  private_account  boolean not null default false,
  show_activity    boolean not null default true,
  who_can_message  text not null default 'everyone' check (who_can_message in ('everyone', 'links', 'nobody')),
  notify_likes     boolean not null default true,
  notify_comments  boolean not null default true,
  notify_links     boolean not null default true,
  notify_rooms     boolean not null default true,
  notify_prices    boolean not null default true,
  notify_email     boolean not null default false,
  language         text not null default 'en' check (language in ('en', 'rw', 'fr')),
  updated_at       timestamptz not null default now()
);
alter table public.user_settings enable row level security;
revoke all on table public.user_settings from anon, authenticated;
insert into public.user_settings (profile_id) select id from public.profiles on conflict do nothing;

-- ───────────────────────── sign up: create the profile automatically ─────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  n text := left(btrim(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1), '')), 40);
  base text; h text; pid uuid;
  faces text[] := array['photo-1500648767791-00dcc994a43e','photo-1506794778202-cad84cf45f1d','photo-1507003211169-0a1dd7228f2d','photo-1438761681033-6461ffad8d80',
    'photo-1472099645785-5658abf4ff4e','photo-1494790108377-be9c29b29330','photo-1534528741775-53994a69daeb','photo-1544005313-94ddf0286df2',
    'photo-1519085360753-af0119f7cbe7','photo-1531123897727-8f129e1688ce','photo-1560250097-0b93528c311a'];
begin
  if n = '' then n := 'New member'; end if;
  base := lower(regexp_replace(coalesce(nullif(new.raw_user_meta_data ->> 'handle', ''), split_part(coalesce(new.email, 'user'), '@', 1)), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base) < 3 then base := base || 'user'; end if;
  base := left(base, 16); h := base;
  while exists (select 1 from public.profiles where handle = h) loop h := base || floor(random() * 9000 + 1000)::int; end loop;
  insert into public.profiles (auth_id, handle, name, role, avatar)
  values (new.id, h, n, case when new.raw_user_meta_data ->> 'role' = 'Landlord' then 'Landlord' else 'Student' end,
          faces[1 + floor(random() * array_length(faces, 1))::int])
  returning id into pid;
  insert into public.user_settings (profile_id) values (pid);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- is this username free? (used live on the sign-up form, so it is open to visitors)
create function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = ''
as $$ select lower(btrim(coalesce(p_handle, ''))) ~ '^[a-z0-9_]{3,20}$'
       and not exists (select 1 from public.profiles where handle = lower(btrim(p_handle))) $$;

-- ───────────────────────── privacy helper ─────────────────────────
create function public.can_see_profile(p_author uuid, p_viewer uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_author = p_viewer
      or not coalesce((select private_account from public.user_settings where profile_id = p_author), false)
      or exists (select 1 from public.links k where k.follower_id = p_viewer and k.followee_id = p_author)
$$;
revoke execute on function public.can_see_profile(uuid, uuid) from public, anon, authenticated;

-- get_app_data: hide posts of private accounts you are not linked with, and notifications you switched off
create or replace function public.get_app_data() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); c jsonb; s public.user_settings;
begin
  if me is null then raise exception 'Please log in'; end if;
  c := public.get_app_data_core();
  select * into s from public.user_settings where profile_id = me;
  return c || jsonb_build_object(
    'me', (c -> 'me') || jsonb_build_object('handle', (select handle from public.profiles where id = me)),
    'handles', (select coalesce(jsonb_object_agg(id, handle), '{}'::jsonb) from public.profiles),
    'storyHandles', (select coalesce(jsonb_object_agg(st.id, p.handle), '{}'::jsonb)
                     from public.stories st join public.profiles p on p.id = st.author_id),
    'posts', coalesce((select jsonb_agg(x) from jsonb_array_elements(c -> 'posts') x
                       where public.can_see_profile((x -> 'author' ->> 'id')::uuid, me)), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(x) from jsonb_array_elements(c -> 'notifications') x
                       where case x ->> 't'
                         when 'like' then coalesce(s.notify_likes, true)
                         when 'comment' then coalesce(s.notify_comments, true)
                         when 'mention' then coalesce(s.notify_comments, true)
                         when 'follow' then coalesce(s.notify_links, true)
                         when 'house' then coalesce(s.notify_rooms, true)
                         when 'price' then coalesce(s.notify_prices, true)
                         else true end), '[]'::jsonb));
end $$;

-- get_profile: tell the page when the posts are hidden (private account)
alter function public.get_profile(text) rename to get_profile_core;
revoke execute on function public.get_profile_core(text) from public, anon, authenticated;
create function public.get_profile(p_handle text default null) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); r jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  r := public.get_profile_core(p_handle);
  if r is null then return null; end if;
  return r || jsonb_build_object('restricted', not public.can_see_profile((r ->> 'id')::uuid, me),
                                 'private', coalesce((select private_account from public.user_settings where profile_id = (r ->> 'id')::uuid), false));
end $$;

-- ───────────────────────── settings API ─────────────────────────
create function public.get_settings() returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id(); s public.user_settings; p public.profiles;
begin
  if me is null then raise exception 'Please log in'; end if;
  insert into public.user_settings (profile_id) values (me) on conflict do nothing;
  select * into s from public.user_settings where profile_id = me;
  select * into p from public.profiles where id = me;
  return jsonb_build_object(
    'name', p.name, 'handle', p.handle, 'avatar', p.avatar, 'role', p.role,
    'email', (select email from auth.users where id = auth.uid()),
    'privateAccount', s.private_account, 'showActivity', s.show_activity, 'whoCanMessage', s.who_can_message,
    'notifyLikes', s.notify_likes, 'notifyComments', s.notify_comments, 'notifyLinks', s.notify_links,
    'notifyRooms', s.notify_rooms, 'notifyPrices', s.notify_prices, 'notifyEmail', s.notify_email, 'language', s.language);
end $$;

create function public.update_setting(p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  insert into public.user_settings (profile_id) values (me) on conflict do nothing;
  if p_key in ('private_account','show_activity','notify_likes','notify_comments','notify_links','notify_rooms','notify_prices','notify_email') then
    if jsonb_typeof(p_value) <> 'boolean' then raise exception 'Invalid value'; end if;
    execute format('update public.user_settings set %I = $1, updated_at = now() where profile_id = $2', p_key) using (p_value #>> '{}')::boolean, me;
  elsif p_key = 'who_can_message' then
    if (p_value #>> '{}') not in ('everyone','links','nobody') then raise exception 'Invalid value'; end if;
    update public.user_settings set who_can_message = p_value #>> '{}', updated_at = now() where profile_id = me;
  elsif p_key = 'language' then
    if (p_value #>> '{}') not in ('en','rw','fr') then raise exception 'Invalid value'; end if;
    update public.user_settings set language = p_value #>> '{}', updated_at = now() where profile_id = me;
  else
    raise exception 'Unknown setting';
  end if;
  return public.get_settings();
end $$;

-- delete my account for good (profile, posts, comments, links ... all cascade from the auth user)
create function public.delete_account() returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  delete from auth.users where id = auth.uid();
  return jsonb_build_object('deleted', true);
end $$;

-- ───────────────────────── who may call what ─────────────────────────
-- everything needs a signed-in user, except the username check used on the sign-up form
revoke execute on function
  public.get_app_data(), public.toggle_post_like(uuid), public.add_comment(uuid, bigint, text), public.toggle_comment_like(bigint),
  public.toggle_link(uuid), public.mark_notification_read(bigint), public.mark_all_notifications_read(), public.toggle_saved_room(text),
  public.send_room_message(text, text), public.request_room_visit(text, date), public.create_post(text, text, text),
  public.get_profile(text), public.update_profile(text, text, text, text, text, text, text), public.delete_post(uuid),
  public.get_settings(), public.update_setting(text, jsonb), public.delete_account(), public.handle_available(text)
  from public, anon;
grant execute on function
  public.get_app_data(), public.toggle_post_like(uuid), public.add_comment(uuid, bigint, text), public.toggle_comment_like(bigint),
  public.toggle_link(uuid), public.mark_notification_read(bigint), public.mark_all_notifications_read(), public.toggle_saved_room(text),
  public.send_room_message(text, text), public.request_room_visit(text, date), public.create_post(text, text, text),
  public.get_profile(text), public.update_profile(text, text, text, text, text, text, text), public.delete_post(uuid),
  public.get_settings(), public.update_setting(text, jsonb), public.delete_account()
  to authenticated;
grant execute on function public.handle_available(text) to anon, authenticated;
