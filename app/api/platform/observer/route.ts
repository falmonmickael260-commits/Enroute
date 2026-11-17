import { observerResponse } from '../../../../admin-observer/server.mjs';
import { publicRoomSnapshot } from '../../../../admin-observer/projection.mjs';
export async function POST(request: Request) {
  return observerResponse(request, 'kilomax', async (code, instance) => {
    const key = process.env.GAME_SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error('Mode spectateur indisponible.');
    const url = new URL('/rest/v1/rooms', process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wcdoavbmexzgjhmmrsvj.supabase.co');
    url.search = new URLSearchParams({ code: `eq.${code}`, select: 'code,created_at,status,version,state,players', limit: '1' }).toString();
    const response = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('Observation indisponible.');
    const rooms = await response.json();
    return publicRoomSnapshot(rooms[0] || null, code, instance);
  });
}
