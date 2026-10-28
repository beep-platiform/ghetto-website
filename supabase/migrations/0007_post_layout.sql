-- 0007: a post's layout follows what it has (photos / type) instead of alternating. The Create page preview uses the same rule.

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
  -- layout: big photo grid when there are 2+ photos (or a room with a photo); otherwise the compact row with a small thumbnail
  k := case when cardinality(ph) >= 2 or (ty = 'room' and cardinality(ph) >= 1) then 'featured' else 'compact' end;
  insert into public.posts (author_id, kind, title, body, location, category, tag, photos, photo_total, more_count, sign,
                            post_type, price, tags, audience, comments_on, alt)
  values (me, k, t, b, loc, btrim(kw || ' ' || array_to_string(tg, ' ')), case when ty = 'room' then 'New' end,
          ph, cardinality(ph), greatest(cardinality(ph) - 3, 0),
          case when pr is not null then to_char(pr, 'FM999,999,999') || ' RWF' end,
          ty, pr, tg, coalesce(p_audience, 'everyone'), coalesce(p_comments, true), nullif(btrim(coalesce(p_alt, '')), ''))
  returning * into np;
  return public.post_json(np, me);
end $$;
