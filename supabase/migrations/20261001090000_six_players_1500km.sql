-- KILOMAX — jusqu'à 6 pilotes et nouvelle course de 1500 km.
--
-- Refait create_room et join_room (create or replace : les droits d'exécution
-- accordés par la migration précédente sont conservés) :
--   * distances autorisées : 700, 1000 et 1500 km (la course de 400 km disparaît) ;
--   * 6 joueurs maximum par partie ;
--   * 2 nouvelles couleurs de pilote : violet et rose.

-- ---------------------------------------------------------------- création

create or replace function public.create_room(p_player_id text, p_name text, p_ambiance text, p_target integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := public.enroute_clean_name(p_name);
  v_code text;
  v_secret uuid;
begin
  perform public.enroute_check_player_id(p_player_id);
  if p_ambiance not in ('jour', 'crepuscule', 'nuit') then
    raise exception 'Ambiance invalide' using errcode = '22023';
  end if;
  -- Distances proposées : Courte 700, Standard 1000, Longue 1500.
  if p_target not in (700, 1000, 1500) then
    raise exception 'Distance invalide' using errcode = '22023';
  end if;

  -- Ménage : on oublie les parties que personne n'a touchées depuis quelques jours.
  delete from public.rooms where updated_at < now() - interval '3 days';

  v_code := public.enroute_new_code();
  insert into public.rooms (code, host_id, settings, players)
  values (
    v_code,
    p_player_id,
    jsonb_build_object('ambiance', p_ambiance, 'target', p_target),
    jsonb_build_array(jsonb_build_object('id', p_player_id, 'name', v_name, 'color', 'crimson', 'ready', false))
  );
  insert into public.room_members (code, player_id) values (v_code, p_player_id)
  returning secret into v_secret;

  return jsonb_build_object('code', v_code, 'secret', v_secret);
end;
$$;

-- ---------------------------------------------------------------- arrivée d'un pilote

create or replace function public.join_room(p_code text, p_player_id text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := public.enroute_clean_name(p_name);
  v_room public.rooms%rowtype;
  v_color text;
  v_secret uuid;
begin
  perform public.enroute_check_player_id(p_player_id);
  select * into v_room from public.rooms where code = upper(btrim(p_code)) for update;
  if not found then
    raise exception 'Partie introuvable' using errcode = 'P0002';
  end if;
  if v_room.status <> 'lobby' then
    raise exception 'La partie a déjà commencé' using errcode = '55000';
  end if;
  if exists (select 1 from public.room_members where code = v_room.code and player_id = p_player_id) then
    raise exception 'Vous êtes déjà dans cette partie' using errcode = '23505';
  end if;
  -- 6 pilotes au maximum (une couleur chacun).
  if jsonb_array_length(v_room.players) >= 6 then
    raise exception 'Partie complète (6 joueurs maximum)' using errcode = '55000';
  end if;

  -- Première couleur encore libre, dans l'ordre d'arrivée habituel.
  select c into v_color
    from unnest(array['crimson', 'azure', 'amber', 'emerald', 'violet', 'rose']) with ordinality as t(c, ord)
   where not exists (select 1 from jsonb_array_elements(v_room.players) as p where p ->> 'color' = t.c)
   order by ord
   limit 1;

  update public.rooms
     set players = players || jsonb_build_array(
           jsonb_build_object('id', p_player_id, 'name', v_name, 'color', v_color, 'ready', false)),
         updated_at = now()
   where code = v_room.code;
  insert into public.room_members (code, player_id) values (v_room.code, p_player_id)
  returning secret into v_secret;

  return jsonb_build_object('code', v_room.code, 'secret', v_secret);
end;
$$;
