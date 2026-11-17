// Server-only public projection; never return the room's raw state or players.
function timestamp(value) {
  return String(value).replace('T', ' ').replace(/Z$/, '+00').replace(/\+00:00$/, '+00')
    .replace(/(\.\d*?[1-9])0+(?=\+00$)/, '$1').replace(/\.0+(?=\+00$)/, '');
}
export function publicRoomSnapshot(room, code, instance) {
  if (!room || room.code !== code || `${code}:${timestamp(room.created_at)}` !== instance) return null;
  const state = room.state || {};
  const source = Array.isArray(state.players) ? state.players : Array.isArray(room.players) ? room.players : [];
  const players = source.map(player => {
    const result = {};
    for (const key of ['id','name','distance','hazard','limited','shields','finished','connected','ready']) {
      if (player[key] !== undefined) result[key] = player[key];
    }
    result.cardCount = Array.isArray(player.hand) ? player.hand.length : 0;
    return result;
  });
  const result = { code:room.code, status:room.status, version:room.version, players };
  for (const key of ['phase','turn','currentPlayerIndex','winnerId','target','discard']) {
    if (state[key] !== undefined) result[key] = state[key];
  }
  return result;
}
