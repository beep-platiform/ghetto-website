-- 0014: settings that really work, saved per user.
alter table public.user_settings
  add column theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  add column text_size text not null default 'normal' check (text_size in ('small', 'normal', 'large')),
  add column reduce_motion boolean not null default false,
  add column data_saver boolean not null default false,
  add column notify_messages boolean not null default true,
  add column quiet_enabled boolean not null default false,
  add column quiet_from text not null default '22:00' check (quiet_from ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add column quiet_to text not null default '07:00' check (quiet_to ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

create table public.feedback (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('problem', 'idea', 'other')),
  body text not null check (char_length(body) between 5 and 1000),
  created_at timestamptz not null default now());
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated, public;

-- "Activity status" now really controls whether people can see when you were last online
create or replace function public.msg_flag(p uuid, k text) returns boolean
language sql stable security definer set search_path = '' as $$
  select case k when 'receipts' then coalesce((select read_receipts from public.message_settings where profile_id = p), true)
                when 'seen' then coalesce((select show_last_active from public.message_settings where profile_id = p), true)
                                 and coalesce((select show_activity from public.user_settings where profile_id = p), true)
                else coalesce((select sounds from public.message_settings where profile_id = p), true) end
$$;

create or replace function public.get_settings() returns jsonb
language plpgsql security definer set search_path = '' as $$
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
    'notifyRooms', s.notify_rooms, 'notifyPrices', s.notify_prices, 'notifyEmail', s.notify_email, 'language', s.language,
    'theme', s.theme, 'textSize', s.text_size, 'reduceMotion', s.reduce_motion, 'dataSaver', s.data_saver,
    'notifyMessages', s.notify_messages, 'quietEnabled', s.quiet_enabled, 'quietFrom', s.quiet_from, 'quietTo', s.quiet_to);
end $$;

create or replace function public.update_setting(p_key text, p_value jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); v text := p_value #>> '{}';
begin
  if me is null then raise exception 'Please log in'; end if;
  insert into public.user_settings (profile_id) values (me) on conflict do nothing;
  if p_key in ('private_account', 'show_activity', 'notify_likes', 'notify_comments', 'notify_links', 'notify_rooms', 'notify_prices', 'notify_email',
               'reduce_motion', 'data_saver', 'notify_messages', 'quiet_enabled') then
    if jsonb_typeof(p_value) <> 'boolean' then raise exception 'Invalid value'; end if;
    execute format('update public.user_settings set %I = $1, updated_at = now() where profile_id = $2', p_key) using v::boolean, me;
  elsif p_key = 'who_can_message' then
    if v not in ('everyone', 'links', 'nobody') then raise exception 'Invalid value'; end if;
    update public.user_settings set who_can_message = v, updated_at = now() where profile_id = me;
  elsif p_key = 'language' then
    if v not in ('en', 'rw', 'fr') then raise exception 'Invalid value'; end if;
    update public.user_settings set language = v, updated_at = now() where profile_id = me;
  elsif p_key = 'theme' then
    if v not in ('light', 'dark', 'system') then raise exception 'Invalid value'; end if;
    update public.user_settings set theme = v, updated_at = now() where profile_id = me;
  elsif p_key = 'text_size' then
    if v not in ('small', 'normal', 'large') then raise exception 'Invalid value'; end if;
    update public.user_settings set text_size = v, updated_at = now() where profile_id = me;
  elsif p_key in ('quiet_from', 'quiet_to') then
    if v !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Invalid time'; end if;
    execute format('update public.user_settings set %I = $1, updated_at = now() where profile_id = $2', p_key) using v, me;
  else
    raise exception 'Unknown setting';
  end if;
  return public.get_settings();
end $$;

-- send a problem report or an idea to the team
create function public.submit_feedback(p_kind text, p_body text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); b text := btrim(coalesce(p_body, ''));
begin
  if me is null then raise exception 'Please log in'; end if;
  if p_kind not in ('problem', 'idea', 'other') then raise exception 'Choose a type'; end if;
  if char_length(b) < 5 then raise exception 'Please write a little more'; end if;
  if char_length(b) > 1000 then raise exception 'Message must be up to 1000 characters'; end if;
  if (select count(*) from public.feedback where profile_id = me and created_at > now() - interval '1 day') >= 10 then raise exception 'You sent a lot today. Try again tomorrow'; end if;
  insert into public.feedback (profile_id, kind, body) values (me, p_kind, b);
  return true;
end $$;

-- a copy of everything that is yours, to download
create function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id();
begin
  if me is null then raise exception 'Please log in'; end if;
  return jsonb_build_object(
    'exportedAt', now(),
    'profile', (select to_jsonb(p) - 'auth_id' from public.profiles p where p.id = me),
    'settings', public.get_settings(),
    'posts', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) from public.posts x where x.author_id = me),
    'comments', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) from public.comments x where x.author_id = me),
    'rooms', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.rooms x where x.landlord_id = me),
    'products', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from public.products x where x.seller_id = me),
    'savedPosts', (select coalesce(jsonb_agg(x.post_id), '[]'::jsonb) from public.saved_posts x where x.profile_id = me),
    'linkedWith', (select coalesce(jsonb_agg(x.followee_id), '[]'::jsonb) from public.links x where x.follower_id = me),
    'messagesSent', (select coalesce(jsonb_agg(jsonb_build_object('at', m.created_at, 'text', m.body, 'photo', m.photo) order by m.id), '[]'::jsonb)
                      from public.messages m where m.sender_id = me and m.deleted_at is null));
end $$;

-- bring back every post you chose "Not interested" on
create function public.reset_hidden_posts() returns int
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); n int;
begin
  if me is null then raise exception 'Please log in'; end if;
  delete from public.hidden_posts where profile_id = me;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.submit_feedback(text, text), public.export_my_data(), public.reset_hidden_posts() from public, anon;
grant execute on function public.submit_feedback(text, text), public.export_my_data(), public.reset_hidden_posts() to authenticated;
