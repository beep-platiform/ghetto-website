-- 0005: notifications carry the post thumbnail; get_post() opens one post that is not in the loaded feed yet.

create or replace function public.notif_single(n public.notifications, p_me uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', n.id::text, 'ids', jsonb_build_array(n.id), 'g', case when n.read then 'Earlier' else 'New' end, 't', n.kind,
    'av', a.avatar, 'html', n.html, 'quote', n.quote, 'time', public.ago_short(n.created_at), 'unread', not n.read,
    'post', n.post_id, 'cm', n.opens_comments, 'fb', n.kind = 'follow', 'name', a.name, 'actor', a.id, 'count', 1,
    'photo', (select p.photos[1] from public.posts p where p.id = n.post_id),
    'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a.id))
  from (select 1) o left join public.profiles a on a.id = n.actor_id
$$;

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
    'photo', (select p.photos[1] from public.posts p where p.id = rep.post_id),
    'fb', false, 'name', n1, 'actor', a1.id, 'count', p_cnt, 'people', n,
    'linked', exists (select 1 from public.links k where k.follower_id = p_me and k.followee_id = a1.id));
end $$;

create or replace function public.get_post(p_post uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); po public.posts;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into po from public.posts where id = p_post;
  if po.id is null or not public.can_see_profile(po.author_id, me) then return null; end if;
  return public.post_json(po, me);
end $$;
revoke all on function public.get_post(uuid) from public, anon;
grant execute on function public.get_post(uuid) to authenticated;
revoke all on function public.notif_single(public.notifications, uuid) from public, anon, authenticated;
revoke all on function public.notif_group(public.notifications, int, timestamptz, boolean, bigint[], uuid[], uuid) from public, anon, authenticated;
