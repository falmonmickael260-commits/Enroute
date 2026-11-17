import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
try {
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create publication supabase_realtime;');
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(file, dir), 'utf8'));
  const hostId = randomUUID(), a = randomUUID(), b = randomUUID();
  const room = (await db.query("select create_room($1,'Alice','jour',1500) as result", [hostId])).rows[0].result;
  const c = { v: 1, game: 'kilomax', operation: 'inspect', room: room.code, uid: a, name: 'Alice', proof: { code: room.code, playerId: hostId, secret: room.secret } };
  const call = async command => (await db.query('select platform_connector($1::jsonb) as result', [JSON.stringify(command)])).rows[0].result;
  const snapshot = (await call(c)).room;
  const admission = { ...c, operation: 'admit', uid: b, inviter: a, name: 'Bob', invitation: randomUUID(), instance: snapshot.instance };
  const joined = await call(admission);
  assert.deepEqual((await call(admission)).session, joined.session);
  assert.equal((await db.query('select jsonb_array_length(players)::int as n from rooms where code=$1',[room.code])).rows[0].n, 2);
  assert.equal((await call({ ...c, uid: b, proof: joined.session })).room.count, 2);
  await assert.rejects(call({ ...admission, instance: 'old' }), /remplacé/);
  await assert.rejects(call({ ...admission, proof: { ...c.proof, secret: randomUUID() } }), /ami/);
  for (let i = 0; i < 4; i++) await db.query("select join_room($1,$2,'Invité')",[room.code,randomUUID()]);
  await assert.rejects(call({ ...admission, uid: randomUUID() }), /complète/);
  const privateState={phase:'draw',turn:1,target:1500,currentPlayerIndex:0,winnerId:null,deck:[{uid:'HIDDEN-DECK',defId:'SECRET'}],
    players:[{id:hostId,name:'Alice',hand:[{uid:'HIDDEN-HAND',defId:'SECRET'}],distance:100,hazard:null,connected:true}],discard:[]};
  await db.query("update rooms set state=$2,status='playing' where code=$1",[room.code,privateState]);
  const before=(await db.query('select version,updated_at from rooms where code=$1',[room.code])).rows[0];
  const observed=(await db.query('select platform_observer($1,$2) as result',[room.code,snapshot.instance])).rows[0].result;
  assert.equal(observed.players[0].cardCount,1);assert.equal(observed.players[0].distance,100);
  assert.equal(JSON.stringify(observed).includes('HIDDEN'),false);assert.equal('deck' in observed,false);
  assert.deepEqual((await db.query('select version,updated_at from rooms where code=$1',[room.code])).rows[0],before);
  assert.equal((await db.query('select platform_observer($1,$2) as result',[room.code,'replaced'])).rows[0].result,null);
  await db.exec('set role anon');
  await assert.rejects(call(c), /permission/);
  await assert.rejects(db.query('select platform_observer($1,$2)',[room.code,snapshot.instance]),/permission/);
  console.log('Kilomax : identité, admission sans code, idempotence, invité, capacité, instance et permissions SQL vérifiés.');
} finally { await db.close(); }
