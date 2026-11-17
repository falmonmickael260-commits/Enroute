-- Read-only projection: no seat, room_sync, last_seen or game version update.
create function public.platform_observer(p_code text,p_instance text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare r public.rooms; players jsonb;
begin
  select * into r from public.rooms where code=p_code;
  if not found or r.code||':'||r.created_at::text<>p_instance then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p->'id','name',p->'name','distance',p->'distance','hazard',p->'hazard',
    'limited',p->'limited','shields',p->'shields','finished',p->'finished',
    'connected',p->'connected','ready',p->'ready','cardCount',jsonb_array_length(coalesce(p->'hand','[]'::jsonb)))),'[]')
    into players from jsonb_array_elements(coalesce(r.state->'players',r.players)) p;
  return jsonb_build_object('code',r.code,'status',r.status,'version',r.version,'players',players,
    'phase',r.state->'phase','turn',r.state->'turn','currentPlayerIndex',r.state->'currentPlayerIndex',
    'winnerId',r.state->'winnerId','target',r.state->'target','discard',r.state->'discard');
end $$;
revoke all on function public.platform_observer(text,text) from public,anon,authenticated;
grant execute on function public.platform_observer(text,text) to service_role;
