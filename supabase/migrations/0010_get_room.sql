-- one room by id (so /rooms/<id> can open a room that is not on the first page)
create function public.get_room(p_room text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := public.current_profile_id(); r public.rooms;
begin
  if me is null then raise exception 'Please log in'; end if;
  select * into r from public.rooms where id = p_room;
  if r.id is null then return null; end if;
  return public.room_json(r, me);
end $$;
revoke all on function public.get_room(text) from public, anon;
grant execute on function public.get_room(text) to authenticated;
