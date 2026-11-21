create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema kilomax_commerce;
revoke all on schema kilomax_commerce from public, anon, authenticated;
create table kilomax_commerce.signing_key (
  singleton boolean primary key default true check (singleton),
  secret text not null check (length(secret) >= 32)
);
revoke all on kilomax_commerce.signing_key from public, anon, authenticated;

create function kilomax_commerce.premium_car(p_car text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_car in ('concept-gt', 'gt-circuit', 'pickup-classic', 'moto-amethyste', 'chenille'), false)
$$;

create function kilomax_commerce.valid_signature(p_message text, p_signature text)
returns boolean language sql stable set search_path = '' as $$
  select coalesce((
    select encode(extensions.hmac(convert_to(p_message, 'UTF8'), convert_to(secret, 'UTF8'), 'sha256'), 'hex') = p_signature
    from kilomax_commerce.signing_key
  ), false)
$$;

create or replace function public.set_car(p_code text, p_player_id text, p_secret uuid, p_car text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  if p_car is null or p_car !~ '^[a-z][a-z-]{1,23}$' or kilomax_commerce.premium_car(p_car) then
    raise exception 'Ce véhicule demande une autorisation d’achat.' using errcode = '22023';
  end if;
  update public.rooms set players = (
    select jsonb_agg(case when p ->> 'id' = p_player_id then jsonb_set(p, '{car}', to_jsonb(p_car)) else p end order by ord)
    from jsonb_array_elements(players) with ordinality as t(p, ord)
  ), updated_at = now() where code = p_code and status = 'lobby';
end;
$$;

create function public.set_premium_car(
  p_code text, p_player_id text, p_secret uuid, p_car text, p_expires bigint, p_signature text
) returns void language plpgsql security definer set search_path = '' as $$
declare v_now bigint := floor(extract(epoch from now()))::bigint;
begin
  perform public.enroute_assert_member(p_code, p_player_id, p_secret);
  if not kilomax_commerce.premium_car(p_car) or p_expires is null or p_expires < v_now or p_expires > v_now + 120 or
      not kilomax_commerce.valid_signature(
        'kilomax-car-v1.' || p_code || '.' || p_player_id || '.' || p_secret || '.' || p_car || '.' || p_expires,
        p_signature
      ) then
    raise exception 'Véhicule premium indisponible pour cette place.' using errcode = '22023';
  end if;
  update public.rooms set players = (
    select jsonb_agg(case when p ->> 'id' = p_player_id then jsonb_set(p, '{car}', to_jsonb(p_car)) else p end order by ord)
    from jsonb_array_elements(players) with ordinality as t(p, ord)
  ), updated_at = now() where code = p_code and status = 'lobby';
end;
$$;
revoke execute on function public.set_premium_car(text, text, uuid, text, bigint, text) from public;
grant execute on function public.set_premium_car(text, text, uuid, text, bigint, text) to anon, authenticated;

create function kilomax_commerce.check_race_commerce()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_car jsonb;
  v_receipt jsonb;
  v_old_receipts jsonb := '[]'::jsonb;
  v_receipts jsonb := coalesce(new.state -> 'usedChestReceipts', '[]'::jsonb);
  v_match text := (new.state ->> 'id') || ':' || (new.state ->> 'startedAt');
  v_previous_driver text;
begin
  for v_car in select value from jsonb_array_elements(coalesce(new.state -> 'players', '[]'::jsonb)) loop
    if kilomax_commerce.premium_car(v_car ->> 'car') and not exists (
      select 1 from jsonb_array_elements(new.players) as lobby(driver)
      where driver ->> 'id' = v_car ->> 'id' and driver ->> 'car' = v_car ->> 'car'
    ) then raise exception 'Véhicule non autorisé dans cette course.' using errcode = '22023';
    end if;
  end loop;
  if old.status = 'playing' then
    v_old_receipts := coalesce(old.state -> 'usedChestReceipts', '[]'::jsonb);
    v_previous_driver := old.state -> 'players' -> ((old.state ->> 'currentPlayerIndex')::integer) ->> 'id';
  end if;
  if not (v_receipts @> v_old_receipts) then
    raise exception 'Reçu de coffre manquant.' using errcode = '22023';
  end if;
  for v_receipt in select value from jsonb_array_elements(v_receipts) loop
    if v_old_receipts @> jsonb_build_array(v_receipt) then continue; end if;
    if old.status <> 'playing' or old.state ->> 'phase' <> 'action' or new.last_actor is distinct from v_previous_driver or
       v_receipt ->> 'player' is distinct from v_previous_driver or
       not kilomax_commerce.valid_signature(
         'kilomax-chest-v1.' || (v_receipt ->> 'id') || '.' || v_match || '.' ||
         (v_receipt ->> 'player') || '.' || (v_receipt ->> 'reward'), v_receipt ->> 'proof'
       ) or exists (select 1 from jsonb_array_elements(v_old_receipts) prior where prior ->> 'player' = v_previous_driver) then
      raise exception 'Reçu de coffre invalide.' using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;

create trigger kilomax_race_commerce before update of state on public.rooms
for each row execute function kilomax_commerce.check_race_commerce();
