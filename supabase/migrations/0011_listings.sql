-- Room listings (landlords only), the marketplace (products), and photo clean-up for both.

-- =============================================================== rooms: only landlords can list one
create function public.room_args_ok(p_title text, p_type text, p_area text, p_km numeric, p_price int, p_beds int, p_bath text,
  p_fac text[], p_from date, p_deposit text, p_min text, p_about text) returns void
language plpgsql stable set search_path = '' as $$
declare x text;
begin
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 90 then raise exception 'Title must be 3 to 90 characters'; end if;
  if p_type is null or p_type not in ('single', 'shared', 'house', 'apartment') then raise exception 'Choose the room type'; end if;
  if char_length(btrim(coalesce(p_area, ''))) not between 2 and 60 then raise exception 'Add the area'; end if;
  if p_km is null or p_km < 0 or p_km > 50 then raise exception 'Distance from campus must be 0 to 50 km'; end if;
  if p_price is null or p_price < 1000 or p_price > 100000000 then raise exception 'Add a monthly price'; end if;
  if p_beds is null or p_beds not between 1 and 20 then raise exception 'Bedrooms must be 1 to 20'; end if;
  if p_bath is null or p_bath not in ('Private', 'Shared') then raise exception 'Choose the bathroom'; end if;
  foreach x in array coalesce(p_fac, '{}') loop
    if x not in ('wifi', 'water', 'electricity', 'kitchen', 'security', 'furnished') then raise exception 'Unknown facility'; end if;
  end loop;
  if p_from is null or p_from < current_date - 1 or p_from > current_date + 366 then raise exception 'Choose when it is available'; end if;
  if p_deposit is null or p_deposit not in ('None', '1 month', '2 months', '3 months') then raise exception 'Choose the deposit'; end if;
  if p_min is null or p_min not in ('1 month', '3 months', '6 months', '12 months') then raise exception 'Choose the minimum stay'; end if;
  if char_length(btrim(coalesce(p_about, ''))) not between 10 and 2000 then raise exception 'Describe the room (10 to 2000 characters)'; end if;
end $$;

create function public.photos_ok(p_photos text[], p_min int, p_max int) returns void
language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid(); folder text; u text; n int := cardinality(coalesce(p_photos, '{}'));
begin
  if uid is null then raise exception 'Please log in'; end if;
  if n < p_min then raise exception 'Add at least % photo(s)', p_min; end if;
  if n > p_max then raise exception 'Up to % photos', p_max; end if;
  folder := '/storage/v1/object/public/post-images/' || uid::text || '/';
  foreach u in array coalesce(p_photos, '{}') loop
    if u is null or u not like 'https://%' or position(folder in u) = 0 or char_length(u) > 400 then raise exception 'Invalid photo'; end if;
  end loop;
end $$;

create function public.create_room(p_title text, p_type text, p_area text, p_km numeric, p_price int, p_beds int, p_bath text,
  p_fac text[], p_from date, p_deposit text, p_min text, p_about text, p_photos text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); r public.rooms; rid text; rk int;
begin
  if me is null then raise exception 'Please log in'; end if;
  if (select role from public.profiles where id = me) <> 'Landlord' then raise exception 'Only landlords can list a room'; end if;
  perform public.room_args_ok(p_title, p_type, p_area, p_km, p_price, p_beds, p_bath, p_fac, p_from, p_deposit, p_min, p_about);
  perform public.photos_ok(p_photos, 1, 8);
  if (select count(*) from public.rooms where landlord_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You listed many rooms today. Try again tomorrow';
  end if;
  rid := 'rm' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  select coalesce(min(rank), 1) - 1 into rk from public.rooms;
  insert into public.rooms (id, landlord_id, title, type, area, km, price, beds, bath, facilities, available_from, deposit, min_stay, photos, about, rank)
  values (rid, me, btrim(p_title), p_type, btrim(p_area), round(p_km, 1), p_price, p_beds, p_bath, coalesce(p_fac, '{}'), p_from,
          p_deposit, p_min, p_photos, btrim(p_about), rk) returning * into r;
  return public.room_json(r, me);
end $$;

create function public.update_room(p_room text, p_title text, p_type text, p_area text, p_km numeric, p_price int, p_beds int, p_bath text,
  p_fac text[], p_from date, p_deposit text, p_min text, p_about text, p_photos text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); r public.rooms; old text[]; gone text[];
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into r from public.rooms where id = p_room and landlord_id = me;
  if r.id is null then raise exception 'You can only edit your own rooms'; end if;
  perform public.room_args_ok(p_title, p_type, p_area, p_km, p_price, p_beds, p_bath, p_fac, p_from, p_deposit, p_min, p_about);
  old := r.photos;
  if cardinality(coalesce(p_photos, '{}')) < 1 then raise exception 'A room needs at least one photo'; end if;
  if exists (select 1 from unnest(p_photos) u where not (u = any (old))) then raise exception 'Invalid photo'; end if;
  select coalesce(array_agg(u), '{}') into gone from unnest(old) u where not (u = any (p_photos));
  update public.rooms set title = btrim(p_title), type = p_type, area = btrim(p_area), km = round(p_km, 1), price = p_price, beds = p_beds,
    bath = p_bath, facilities = coalesce(p_fac, '{}'), available_from = p_from, deposit = p_deposit, min_stay = p_min,
    about = btrim(p_about), photos = p_photos where id = p_room returning * into r;
  return jsonb_build_object('room', public.room_json(r, me), 'removed', to_jsonb(gone));
end $$;

create function public.delete_room(p_room text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); ph text[];
begin
  delete from public.rooms where id = p_room and landlord_id = me returning photos into ph;
  if not found then raise exception 'You can only delete your own rooms'; end if;
  return jsonb_build_object('deleted', true, 'photos', to_jsonb(coalesce(ph, '{}')));
end $$;

-- =============================================================== marketplace
create table public.products (
  id          uuid primary key default gen_random_uuid(),
  seller_id   uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 3 and 90),
  category    text not null check (category in ('electronics', 'furniture', 'books', 'clothes', 'kitchen', 'transport', 'other')),
  condition   text not null check (condition in ('new', 'like_new', 'used', 'fair')),
  price       int  not null check (price between 0 and 100000000),
  negotiable  boolean not null default false,
  description text not null check (char_length(description) between 5 and 2000),
  location    text check (location is null or char_length(location) <= 60),
  photos      text[] not null default '{}',
  status      text not null default 'active' check (status in ('active', 'sold')),
  created_at  timestamptz not null default now()
);
create index products_feed_idx on public.products (created_at desc, id desc);
create index products_cat_idx on public.products (category, created_at desc);
create index products_seller_idx on public.products (seller_id);
alter table public.products enable row level security;
revoke all on table public.products from anon, authenticated;

create table public.product_messages (
  id           bigint generated always as identity primary key,
  product_id   uuid not null references public.products (id) on delete cascade,
  sender_id    uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now()
);
alter table public.product_messages enable row level security;
revoke all on table public.product_messages from anon, authenticated;

create function public.product_json(p public.products, me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'title', p.title, 'category', p.category, 'condition', p.condition, 'price', p.price,
    'negotiable', p.negotiable, 'description', p.description, 'location', p.location, 'photos', to_jsonb(p.photos),
    'status', p.status, 'createdAt', p.created_at, 'ago', public.ago_short(p.created_at), 'mine', p.seller_id = me,
    'seller', jsonb_build_object('id', s.id, 'name', s.name, 'handle', s.handle, 'avatar', s.avatar, 'verified', s.verified, 'role', s.role))
  from public.profiles s where s.id = p.seller_id
$$;

create function public.product_args_ok(p_title text, p_category text, p_condition text, p_price int, p_description text, p_location text) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if char_length(btrim(coalesce(p_title, ''))) not between 3 and 90 then raise exception 'Title must be 3 to 90 characters'; end if;
  if p_category is null or p_category not in ('electronics', 'furniture', 'books', 'clothes', 'kitchen', 'transport', 'other') then raise exception 'Choose a category'; end if;
  if p_condition is null or p_condition not in ('new', 'like_new', 'used', 'fair') then raise exception 'Choose the condition'; end if;
  if p_price is null or p_price < 0 or p_price > 100000000 then raise exception 'Add the price'; end if;
  if char_length(btrim(coalesce(p_description, ''))) not between 5 and 2000 then raise exception 'Describe it (5 to 2000 characters)'; end if;
  if p_location is not null and char_length(btrim(p_location)) > 60 then raise exception 'Place is too long'; end if;
end $$;

create function public.create_product(p_title text, p_category text, p_condition text, p_price int, p_negotiable boolean,
  p_description text, p_location text, p_photos text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); np public.products;
begin
  if me is null then raise exception 'Please log in'; end if;
  perform public.product_args_ok(p_title, p_category, p_condition, p_price, p_description, p_location);
  perform public.photos_ok(p_photos, 1, 6);
  if (select count(*) from public.products where seller_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You listed many products today. Try again tomorrow';
  end if;
  insert into public.products (seller_id, title, category, condition, price, negotiable, description, location, photos)
  values (me, btrim(p_title), p_category, p_condition, p_price, coalesce(p_negotiable, false), btrim(p_description),
          nullif(btrim(coalesce(p_location, '')), ''), p_photos) returning * into np;
  return public.product_json(np, me);
end $$;

create function public.update_product(p_product uuid, p_title text, p_category text, p_condition text, p_price int, p_negotiable boolean,
  p_description text, p_location text, p_photos text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); np public.products; gone text[];
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into np from public.products where id = p_product and seller_id = me;
  if np.id is null then raise exception 'You can only edit your own products'; end if;
  perform public.product_args_ok(p_title, p_category, p_condition, p_price, p_description, p_location);
  if cardinality(coalesce(p_photos, '{}')) < 1 then raise exception 'A product needs at least one photo'; end if;
  if exists (select 1 from unnest(p_photos) u where not (u = any (np.photos))) then raise exception 'Invalid photo'; end if;
  select coalesce(array_agg(u), '{}') into gone from unnest(np.photos) u where not (u = any (p_photos));
  update public.products set title = btrim(p_title), category = p_category, condition = p_condition, price = p_price,
    negotiable = coalesce(p_negotiable, false), description = btrim(p_description), location = nullif(btrim(coalesce(p_location, '')), ''),
    photos = p_photos where id = p_product returning * into np;
  return jsonb_build_object('product', public.product_json(np, me), 'removed', to_jsonb(gone));
end $$;

create function public.set_product_sold(p_product uuid, p_sold boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); np public.products;
begin
  update public.products set status = case when p_sold then 'sold' else 'active' end where id = p_product and seller_id = me returning * into np;
  if np.id is null then raise exception 'You can only change your own products'; end if;
  return public.product_json(np, me);
end $$;

create function public.delete_product(p_product uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); ph text[];
begin
  delete from public.products where id = p_product and seller_id = me returning photos into ph;
  if not found then raise exception 'You can only delete your own products'; end if;
  return jsonb_build_object('deleted', true, 'photos', to_jsonb(coalesce(ph, '{}')));
end $$;

create function public.get_product(p_product uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); np public.products;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into np from public.products where id = p_product;
  if np.id is null then return null; end if;
  return public.product_json(np, me);
end $$;

-- the shop, a page at a time (newest first). Sold items are hidden unless you ask for your own.
create function public.get_products(p_limit int default 8, p_ts timestamptz default null, p_id uuid default null,
  p_category text default null, p_query text default null, p_mine boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); lim int := least(greatest(coalesce(p_limit, 8), 1), 30);
        q text := nullif(btrim(coalesce(p_query, '')), ''); items jsonb; got int; lastts timestamptz; lastid uuid; nxt jsonb;
begin
  if me is null then raise exception 'Please log in'; end if;
  with pg as (
    select row_number() over (order by p.created_at desc, p.id desc)::int rn, p.id, p.created_at from public.products p
    where (case when p_mine then p.seller_id = me else p.status = 'active' end)
      and (p_category is null or p.category = p_category)
      and (q is null or p.title ilike '%' || replace(replace(q, '%', ''), '_', '') || '%' or p.description ilike '%' || replace(replace(q, '%', ''), '_', '') || '%')
      and (p_ts is null or (p.created_at, p.id) < (p_ts, p_id))
    order by p.created_at desc, p.id desc limit lim + 1)
  select coalesce(jsonb_agg(public.product_json(po, me) order by pg.rn) filter (where pg.rn <= lim), '[]'::jsonb), count(*)::int,
         (array_agg(pg.created_at order by pg.rn) filter (where pg.rn = lim))[1], (array_agg(pg.id order by pg.rn) filter (where pg.rn = lim))[1]
    into items, got, lastts, lastid from pg join public.products po on po.id = pg.id;
  if got > lim then nxt := jsonb_build_object('ts', lastts, 'id', lastid); end if;
  return jsonb_build_object('products', items, 'next', nxt);
end $$;

create function public.send_product_message(p_product uuid, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); b text := btrim(coalesce(p_body, '')); owner uuid; new_id bigint;
begin
  if me is null then raise exception 'Please log in'; end if;
  if char_length(b) < 1 or char_length(b) > 500 then raise exception 'Message must be 1 to 500 characters'; end if;
  select seller_id into owner from public.products where id = p_product;
  if owner is null then raise exception 'Product not found'; end if;
  if owner = me then raise exception 'This is your own product'; end if;
  insert into public.product_messages (product_id, sender_id, recipient_id, body) values (p_product, me, owner, b) returning id into new_id;
  return jsonb_build_object('id', new_id);
end $$;

create function public.notify_product_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare t text; nm text;
begin
  select title into t from public.products where id = new.product_id;
  select name into nm from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, actor_id, kind, html, quote, grp)
  values (new.recipient_id, new.sender_id, 'house', '<b>' || public.esc_html(nm) || '</b> asked about <b>' || public.esc_html(coalesce(t, 'your product')) || '</b>', left(new.body, 140), 'New');
  return new;
end $$;
create trigger trg_notify_product_message after insert on public.product_messages for each row execute function public.notify_product_message();

-- =============================================================== reports can now be about products
alter table public.reports drop constraint reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('post', 'comment', 'profile', 'room', 'product'));
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
  else raise exception 'Unknown report type'; end if;
  if not ok then raise exception 'Nothing to report'; end if;
  insert into public.reports (reporter_id, kind, target, reason, note) values (me, p_kind, t, p_reason, nullif(btrim(coalesce(p_note, '')), ''))
  on conflict (reporter_id, kind, target) do nothing;
end $$;

-- =============================================================== every photo I uploaded (for deleting the account)
create or replace function public.my_photo_urls() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(u), '{}') from (
    select unnest(photos) u from public.posts where author_id = public.current_profile_id()
    union all select unnest(photos) from public.rooms where landlord_id = public.current_profile_id()
    union all select unnest(photos) from public.products where seller_id = public.current_profile_id()) x
$$;

-- =============================================================== public pages for products + sitemap
create function public.get_public_product(p_product uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'title', p.title, 'category', p.category, 'condition', p.condition, 'price', p.price,
    'negotiable', p.negotiable, 'description', p.description, 'location', p.location, 'photos', to_jsonb(p.photos), 'status', p.status,
    'createdAt', p.created_at, 'seller', jsonb_build_object('name', s.name, 'handle', s.handle, 'verified', s.verified))
  from public.products p join public.profiles s on s.id = p.seller_id
  where p.id = p_product and not coalesce((select u.private_account from public.user_settings u where u.profile_id = p.seller_id), false)
$$;

create or replace function public.public_sitemap() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'posts', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'at', x.created_at) order by x.created_at desc)
        from (select p.id, p.created_at from public.posts p
              where p.audience = 'everyone'
                and not coalesce((select s.private_account from public.user_settings s where s.profile_id = p.author_id), false)
              order by p.created_at desc limit 2000) x), '[]'::jsonb),
    'rooms', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'at', x.created_at) order by x.rank)
        from (select r.id, r.created_at, r.rank from public.rooms r order by r.rank limit 2000) x), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'at', x.created_at) order by x.created_at desc)
        from (select p.id, p.created_at from public.products p
              where p.status = 'active'
                and not coalesce((select s.private_account from public.user_settings s where s.profile_id = p.seller_id), false)
              order by p.created_at desc limit 2000) x), '[]'::jsonb))
$$;

-- =============================================================== who may call what
revoke all on function public.room_args_ok(text, text, text, numeric, int, int, text, text[], date, text, text, text) from public, anon, authenticated;
revoke all on function public.photos_ok(text[], int, int) from public, anon, authenticated;
revoke all on function public.product_args_ok(text, text, text, int, text, text) from public, anon, authenticated;
revoke all on function public.product_json(public.products, uuid) from public, anon, authenticated;
revoke all on function public.notify_product_message() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array[
    'create_room(text, text, text, numeric, int, int, text, text[], date, text, text, text, text[])',
    'update_room(text, text, text, text, numeric, int, int, text, text[], date, text, text, text, text[])', 'delete_room(text)',
    'create_product(text, text, text, int, boolean, text, text, text[])',
    'update_product(uuid, text, text, text, int, boolean, text, text, text[])', 'set_product_sold(uuid, boolean)', 'delete_product(uuid)',
    'get_product(uuid)', 'get_products(int, timestamptz, uuid, text, text, boolean)', 'send_product_message(uuid, text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.get_public_product(uuid) from public;
grant execute on function public.get_public_product(uuid) to anon, authenticated;
