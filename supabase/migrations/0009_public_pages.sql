-- Public, read-only pages so Google (and anyone with a shared link) can see a post or a room without logging in.
-- Only posts meant for everyone, written by accounts that are not private, are exposed. Nothing else.

create function public.get_public_post(p_post uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id, 'title', p.title, 'body', p.body, 'location', p.location, 'photos', to_jsonb(p.photos),
    'type', p.post_type, 'price', p.price, 'tags', to_jsonb(p.tags), 'alt', p.alt, 'createdAt', p.created_at,
    'author', jsonb_build_object('name', a.name, 'handle', a.handle, 'role', a.role, 'verified', a.verified))
  from public.posts p join public.profiles a on a.id = p.author_id
  where p.id = p_post and p.audience = 'everyone'
    and not coalesce((select s.private_account from public.user_settings s where s.profile_id = p.author_id), false)
$$;

create function public.get_public_room(p_room text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'title', r.title, 'type', r.type, 'area', r.area, 'price', r.price, 'beds', r.beds, 'bath', r.bath,
    'fac', to_jsonb(r.facilities), 'photos', to_jsonb(r.photos), 'about', r.about, 'rate', r.rating, 'rev', r.review_count,
    'from', r.available_from, 'deposit', r.deposit, 'minStay', r.min_stay, 'createdAt', r.created_at,
    'landlord', jsonb_build_object('name', l.name, 'handle', l.handle, 'verified', l.verified))
  from public.rooms r join public.profiles l on l.id = r.landlord_id
  where r.id = p_room
$$;

-- the list the sitemap is built from (newest 2000 of each)
create function public.public_sitemap() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'at', x.created_at) order by x.created_at desc)
        from (select p.id, p.created_at from public.posts p
              where p.audience = 'everyone'
                and not coalesce((select s.private_account from public.user_settings s where s.profile_id = p.author_id), false)
              order by p.created_at desc limit 2000) x), '[]'::jsonb),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'at', x.created_at) order by x.rank)
        from (select r.id, r.created_at, r.rank from public.rooms r order by r.rank limit 2000) x), '[]'::jsonb))
$$;

revoke all on function public.get_public_post(uuid), public.get_public_room(text), public.public_sitemap() from public;
grant execute on function public.get_public_post(uuid), public.get_public_room(text), public.public_sitemap() to anon, authenticated;
