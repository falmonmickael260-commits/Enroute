-- An online game must not freeze when the driver whose turn it is has left
-- AND the host (who normally passes that turn) is away too. In that case any
-- pilot still at the table may commit — in practice, pass the absent driver's
-- turn. "Away" uses the same 15-second window as the presence list.
-- Same signature as before: `create or replace` keeps the grants.

create or replace function public.commit_state(
  p_code text,
  p_player_id text,
  p_secret uuid,
  p_expected_version integer,
  p_state jsonb,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
  v_current text;
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  select * into v_room from public.rooms where code = p_code for update;
  if v_room.status <> 'playing' or v_room.version <> p_expected_version then
    return jsonb_build_object('ok', false, 'version', v_room.version);
  end if;

  v_current := v_room.state -> 'players' -> ((v_room.state ->> 'currentPlayerIndex')::int) ->> 'id';
  if p_player_id <> v_current and p_player_id <> v_room.host_id then
    -- someone else's turn: only allowed when both that driver and the host are gone
    if exists (
      select 1
        from public.room_members as m
       where m.code = p_code
         and m.player_id in (v_current, v_room.host_id)
         and m.last_seen > now() - interval '15 seconds'
    ) then
      raise exception 'Ce n''est pas votre tour' using errcode = '42501';
    end if;
  end if;
  if public.enroute_player_ids(p_state -> 'players') <> public.enroute_player_ids(v_room.state -> 'players') then
    raise exception 'État invalide' using errcode = '22023';
  end if;
  if pg_column_size(p_state) > 262144 or jsonb_array_length(coalesce(p_events, '[]'::jsonb)) > 30 then
    raise exception 'État trop volumineux' using errcode = '54000';
  end if;

  update public.rooms
     set state = p_state,
         events = coalesce(p_events, '[]'::jsonb),
         last_actor = p_player_id,
         version = version + 1,
         status = case when p_state ->> 'phase' = 'gameover' then 'finished' else 'playing' end,
         updated_at = now()
   where code = p_code;
  return jsonb_build_object('ok', true, 'version', v_room.version + 1);
end;
$$;
