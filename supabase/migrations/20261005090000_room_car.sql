-- Each pilot picks their car in the lobby. Stored with the player in rooms.players
-- (key "car"); the host reads it when dealing the game. Additive: nothing else changes.

create function public.set_car(p_code text, p_player_id text, p_secret uuid, p_car text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  if p_car is null or p_car !~ '^[a-z][a-z-]{1,23}$' then
    raise exception 'invalid car' using errcode = '22023';
  end if;
  update public.rooms
     set players = (
           select jsonb_agg(
                    case when p ->> 'id' = p_player_id then jsonb_set(p, '{car}', to_jsonb(p_car)) else p end
                    order by ord)
             from jsonb_array_elements(players) with ordinality as t(p, ord)),
         updated_at = now()
   where code = p_code and status = 'lobby';
end;
$$;

revoke execute on function public.set_car(text, text, uuid, text) from public;
grant execute on function public.set_car(text, text, uuid, text) to anon, authenticated;
