// Ring 2: the complete herd and roughly 6,000 physical input ticks to
// the Wind Cairn. On-foot and remote presses earn no mounted encounter;
// a real threshold checkpoint must admit and resume identically.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot, rider } from './journey-rider.mjs';
import { TITAN_ROUTE } from './titan-route.mjs';
const { actRoutes } = await import('@wildshard/engine/sim/actRoutes');
const { openWorld } = await import('@wildshard/engine/host/openWorld');
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/engine/sim/snapshot');

test('nalati-grasslands: the Titan refuses an unearned mounted encounter and reward', { timeout: 180_000 }, async () => {
  const started = performance.now(), { resident, world, input } = await boot();
  const writer = createSimSnapshotSerializer();
  let resumed;
  try {
    const r = rider(resident), { host, player } = r;
    const state = () => JSON.parse(host.adapters.get('nalati.titan').snapshot());
    r.press('storm-titan.tie'); r.press('storm-titan.reward');
    assert.equal(state().boss.state, 'dormant', 'Remote presses cannot start the fight');
    assert.equal(state().boss.saved.rewardTaken, false, 'A remote reward press grants nothing');
    r.walk(TITAN_ROUTE);
    const before = state();
    assert.equal(before.prompt.label, 'Tie a cloth strip · the wind wants a rider');
    assert.ok(before.prompt.radius > 0, 'The actual cairn offers its on-foot refusal prompt');
    r.press('storm-titan.tie');
    const refused = state();
    assert.equal(refused.boss.state, 'dormant');
    assert.equal(actRoutes(host).tied(), false, 'A player on foot cannot tie the mounted encounter');
    assert.ok(refused.toasts.includes('The wind wants a rider'), 'The actual nearby press explains the refusal');
    r.press('storm-titan.reward');
    assert.equal(state().boss.saved.defeated, false);
    assert.equal(state().boss.saved.rewardTaken, false, 'Reaching the cairn does not earn Naizagai');
    assert.equal(host.flags.has('dead:actor.player'), false);
    assert.equal(player.health.attributes.health, player.health.attributes.maxHealth, 'The walk and refusals leave the player unharmed');
    resumed = await openWorld(input, { room: true, snapshot: writer.serialize(snapshotSimHostBytes(host)) });
    const back = rider(resumed.resident);
    for (let tick = 0; tick < 5; tick++) { r.head(0, 0); back.head(0, 0); assert.deepEqual(resumed.resident.effects, resident.effects); }
    assert.equal(writer.serialize(snapshotSimHostBytes(resumed.host)), writer.serialize(snapshotSimHostBytes(host)),
      'The real refused threshold checkpoint admits and resumes without granting progress');
    console.log(`titan threshold: ${((performance.now() - started) / 1000).toFixed(1)} s, ${host.state.tick} ticks`);
  } finally { try { resumed?.dispose(); } finally { writer.dispose(); world.dispose(); } }
});
