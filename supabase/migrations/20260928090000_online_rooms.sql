-- EN ROUTE — online multiplayer rooms.
--
-- The game state lives in `rooms.state` (JSON produced by the TypeScript engine).
-- Tables are not exposed to the API at all: every read and write goes through the
-- security-definer functions below, which check a per-player secret so nobody can
-- act for someone else, and only the player whose turn it is (or the host, to skip
-- an absent player) can commit a new state.

create table public.rooms (
  code text primary key check (code ~ '^ENR-[A-Z0-9]{4}$'),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished')),
  host_id text not null,
  settings jsonb not null,
  players jsonb not null default '[]'::jsonb,
  state jsonb,
  events jsonb not null default '[]'::jsonb,
  last_actor text,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_members (
  code text not null references public.rooms (code) on delete cascade,
  player_id text not null,
  secret uuid not null default gen_random_uuid(),
  last_seen timestamptz not null default now(),
  primary key (code, player_id)
);

create index rooms_updated_at_idx on public.rooms (updated_at);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
revoke all on public.rooms, public.room_members from anon, authenticated;

-- ---------------------------------------------------------------- helpers

create function public.enroute_assert_member(p_code text, p_player_id text, p_secret uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.room_members
     set last_seen = now()
   where code = p_code and player_id = p_player_id and secret = p_secret;
  if not found then
    raise exception 'Accès refusé à cette partie' using errcode = '42501';
  end if;
end;
$$;

create function public.enroute_clean_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := btrim(coalesce(p_name, ''));
begin
  if char_length(v) < 1 or char_length(v) > 16 then
    raise exception 'Nom invalide (1 à 16 caractères)' using errcode = '22023';
  end if;
  return v;
end;
$$;

create function public.enroute_check_player_id(p_player_id text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_player_id is null or char_length(p_player_id) not between 8 and 64 then
    raise exception 'Identifiant de joueur invalide' using errcode = '22023';
  end if;
end;
$$;

create function public.enroute_new_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  loop
    candidate := 'ENR-';
    for i in 1..4 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = candidate);
  end loop;
  return candidate;
end;
$$;

-- Sorted player ids of a players array (room lobby list or game state).
create function public.enroute_player_ids(p_players jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(p ->> 'id' order by p ->> 'id'), '{}')
  from jsonb_array_elements(coalesce(p_players, '[]'::jsonb)) as p;
$$;

revoke execute on function public.enroute_assert_member(text, text, uuid) from public, anon, authenticated;
revoke execute on function public.enroute_clean_name(text) from public, anon, authenticated;
revoke execute on function public.enroute_check_player_id(text) from public, anon, authenticated;
revoke execute on function public.enroute_new_code() from public, anon, authenticated;
revoke execute on function public.enroute_player_ids(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------- lobby

create function public.create_room(p_player_id text, p_name text, p_ambiance text, p_target integer)
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
  if p_target not in (400, 700, 1000) then
    raise exception 'Distance invalide' using errcode = '22023';
  end if;

  -- Housekeeping: forget rooms nobody touched for a few days.
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

create function public.join_room(p_code text, p_player_id text, p_name text)
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
  if jsonb_array_length(v_room.players) >= 4 then
    raise exception 'Partie complète (4 joueurs maximum)' using errcode = '55000';
  end if;

  select c into v_color
    from unnest(array['crimson', 'azure', 'amber', 'emerald']) with ordinality as t(c, ord)
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

create function public.set_ready(p_code text, p_player_id text, p_secret uuid, p_ready boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  update public.rooms
     set players = (
           select jsonb_agg(
                    case when p ->> 'id' = p_player_id then jsonb_set(p, '{ready}', to_jsonb(p_ready)) else p end
                    order by ord)
             from jsonb_array_elements(players) with ordinality as t(p, ord)),
         updated_at = now()
   where code = p_code and status = 'lobby';
end;
$$;

-- Leaving only removes you from a lobby; once the game started you can always come back.
create function public.leave_room(p_code text, p_player_id text, p_secret uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
  v_remaining jsonb;
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  select * into v_room from public.rooms where code = p_code for update;
  if v_room.status <> 'lobby' then
    return;
  end if;

  select coalesce(jsonb_agg(p order by ord), '[]'::jsonb) into v_remaining
    from jsonb_array_elements(v_room.players) with ordinality as t(p, ord)
   where p ->> 'id' <> p_player_id;

  if jsonb_array_length(v_remaining) = 0 then
    delete from public.rooms where code = p_code;
    return;
  end if;

  delete from public.room_members where code = p_code and player_id = p_player_id;
  update public.rooms
     set players = v_remaining,
         host_id = case when host_id = p_player_id then v_remaining -> 0 ->> 'id' else host_id end,
         updated_at = now()
   where code = p_code;
end;
$$;

-- ---------------------------------------------------------------- game

-- The host deals: the initial state is built client-side by the shared engine.
-- Also used for "Rejouer" once a game is finished.
create function public.start_game(p_code text, p_player_id text, p_secret uuid, p_state jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  select * into v_room from public.rooms where code = p_code for update;
  if v_room.host_id <> p_player_id then
    raise exception 'Seul l''hôte peut lancer la partie' using errcode = '42501';
  end if;
  if v_room.status = 'playing' then
    raise exception 'La partie est déjà en cours' using errcode = '55000';
  end if;
  if jsonb_array_length(v_room.players) < 2 then
    raise exception 'Il faut au moins 2 joueurs' using errcode = '55000';
  end if;
  if v_room.status = 'lobby' and exists (
       select 1 from jsonb_array_elements(v_room.players) as p where not coalesce((p ->> 'ready')::boolean, false)) then
    raise exception 'Tous les joueurs doivent être prêts' using errcode = '55000';
  end if;
  if public.enroute_player_ids(p_state -> 'players') <> public.enroute_player_ids(v_room.players) then
    raise exception 'État de départ invalide' using errcode = '22023';
  end if;
  if pg_column_size(p_state) > 262144 then
    raise exception 'État trop volumineux' using errcode = '54000';
  end if;

  update public.rooms
     set status = 'playing',
         state = p_state,
         events = '[]'::jsonb,
         last_actor = p_player_id,
         version = version + 1,
         updated_at = now()
   where code = p_code;
  return v_room.version + 1;
end;
$$;

-- Optimistic concurrency: the write only lands if nobody committed since
-- `p_expected_version`; otherwise the caller resyncs.
create function public.commit_state(
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
    raise exception 'Ce n''est pas votre tour' using errcode = '42501';
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

-- Polled by every client: heartbeat + lobby/presence info, and the game state
-- only when it changed since `p_known_version`.
create function public.room_sync(p_code text, p_player_id text, p_secret uuid, p_known_version integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms%rowtype;
  v_changed boolean;
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  select * into v_room from public.rooms where code = p_code;
  v_changed := v_room.version is distinct from p_known_version;
  return jsonb_build_object(
    'code', v_room.code,
    'status', v_room.status,
    'hostId', v_room.host_id,
    'settings', v_room.settings,
    'players', v_room.players,
    'online', (
      select coalesce(jsonb_agg(m.player_id), '[]'::jsonb)
        from public.room_members as m
       where m.code = p_code and m.last_seen > now() - interval '15 seconds'),
    'version', v_room.version,
    'lastActor', v_room.last_actor,
    'state', case when v_changed then v_room.state end,
    'events', case when v_changed then v_room.events end
  );
end;
$$;

-- Public preview of a room for someone opening an invite link.
create function public.room_info(p_code text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'code', r.code,
           'status', r.status,
           'settings', r.settings,
           'players', (
             select coalesce(jsonb_agg(jsonb_build_object('name', p ->> 'name', 'color', p ->> 'color') order by ord), '[]'::jsonb)
               from jsonb_array_elements(r.players) with ordinality as t(p, ord)))
    from public.rooms as r
   where r.code = upper(btrim(p_code));
$$;

grant execute on function public.create_room(text, text, text, integer) to anon, authenticated;
grant execute on function public.join_room(text, text, text) to anon, authenticated;
grant execute on function public.set_ready(text, text, uuid, boolean) to anon, authenticated;
grant execute on function public.leave_room(text, text, uuid) to anon, authenticated;
grant execute on function public.start_game(text, text, uuid, jsonb) to anon, authenticated;
grant execute on function public.commit_state(text, text, uuid, integer, jsonb, jsonb) to anon, authenticated;
grant execute on function public.room_sync(text, text, uuid, integer) to anon, authenticated;
grant execute on function public.room_info(text) to anon, authenticated;
