-- Additive account-bound admission. Manual guest RPCs remain unchanged.
alter table public.room_members add column platform_user_id uuid;
create unique index room_platform_user_unique on public.room_members(code,platform_user_id) where platform_user_id is not null;

create function public.platform_connector(p_command jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.rooms; m public.room_members; target public.room_members; uid uuid;
  snapshot jsonb; joined jsonb; player text;
begin
  select * into strict r from public.rooms where code=p_command->>'room' for update;
  select * into m from public.room_members where code=r.code
    and player_id=p_command#>>'{proof,playerId}' and secret=(p_command#>>'{proof,secret}')::uuid;
  if m.player_id is null then raise exception 'Votre ami ne se trouve plus dans ce salon.'; end if;
  uid:=nullif(coalesce(p_command->>'inviter',p_command->>'uid'),'')::uuid;
  if m.platform_user_id is not null and uid is not null and m.platform_user_id<>uid then raise exception 'Cette place appartient à un autre compte.'; end if;
  if uid is not null then update public.room_members set platform_user_id=uid where code=r.code and player_id=m.player_id; end if;
  snapshot:=jsonb_build_object('code',r.code,'instance',r.code||':'||r.created_at::text,
    'capacity',6,'count',jsonb_array_length(r.players),'status',case when r.status='lobby' then 'open' else 'started' end,'ownerUid',coalesce(m.platform_user_id,uid));
  if p_command->>'operation'='inspect' then return jsonb_build_object('room',snapshot); end if;
  if p_command->>'instance'<>r.code||':'||r.created_at::text then raise exception 'Salon remplacé.'; end if;
  uid:=(p_command->>'uid')::uuid;
  select * into target from public.room_members where code=r.code and platform_user_id=uid;
  if target.player_id is null then
    player:='rg-'||uid::text;
    joined:=public.join_room(r.code,player,left(p_command->>'name',20));
    update public.room_members set platform_user_id=uid where code=r.code and player_id=player;
    select * into strict target from public.room_members where code=r.code and player_id=player;
  end if;
  return jsonb_build_object('room',snapshot,'session',jsonb_build_object('code',r.code,'playerId',target.player_id,'secret',target.secret));
end; $$;
revoke all on function public.platform_connector(jsonb) from public,anon,authenticated;
grant execute on function public.platform_connector(jsonb) to service_role;
