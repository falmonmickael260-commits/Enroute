import type { Command, Adapter } from '../../../platform-connector/server.mjs';
async function rpc(command: Command) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wcdoavbmexzgjhmmrsvj.supabase.co';
  const key = process.env.GAME_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Connexion directe Kilomax en cours de configuration.');
  const r = await fetch(`${url}/rest/v1/rpc/platform_connector`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_command: command }), cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('Salon indisponible, complet ou connexion expirée.');
  return r.json();
}
export const platformAdapter: Adapter = {
  inspect: async c => (await rpc({ ...c, operation: 'inspect' })).room,
  admit: async c => (await rpc(c)).session,
};
