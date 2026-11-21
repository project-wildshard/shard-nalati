// Ring 2: the full herd boot and roughly 6,000 physical input ticks from
// spawn to the real kurgan portal. The room's player reaches the chamber
// and its genuine intro checkpoint admits and resumes. The King's fight
// remains open: after a death/retry its native body resets below the room
// floor on engine 0.1.18 (scripts/probe-kurgan.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot, rider } from './journey-rider.mjs';
import { enterKurgan } from './kurgan-route.mjs';
const { openWorld } = await import('@wildshard/engine/host/openWorld');
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/engine/sim/snapshot');

test('nalati-grasslands: enter the kurgan and resume its real intro', { timeout: 180_000 }, async () => {
  const started = performance.now(), { resident, world, input, shard } = await boot();
  const writer = createSimSnapshotSerializer();
  let resumed;
  try {
    const r = rider(resident), { player, host } = r;
    assert.ok(Math.hypot(player.position.x - shard.spawn.x, player.position.z - shard.spawn.z) < 0.5);
    enterKurgan(r);
    assert.ok(player.position.y > 139 && player.position.y < 142, 'The real portal admits the player to the elevated dungeon');
    assert.ok(Math.hypot(player.position.x + 40, player.position.z + 74.7) < 1, 'The portal puts the player at the dromos entrance');
    assert.equal(player.health.attributes.health, player.health.attributes.maxHealth, 'The real walk reaches the tomb unharmed');
    r.walk([[-40, -80], [-40, -82], [-36, -87], [-35, -91]]);
    const king = [...host.entities.values()].find(actor => actor.kind === 'golden-king');
    assert.ok(king?.alive, 'The King is present in his admitted chamber');
    const state = JSON.parse(host.adapters.get('nalati.king').snapshot());
    assert.equal(state.boss.state, 'intro', 'Entering the chamber starts the authored encounter');
    assert.equal(state.boss.saved.defeated, false);
    assert.equal(state.boss.saved.rewardTaken, false);
    resumed = await openWorld(input, { room: true, snapshot: writer.serialize(snapshotSimHostBytes(host)) });
    const back = rider(resumed.resident);
    for (let tick = 0; tick < 5; tick++) {
      r.head(0, 0); back.head(0, 0);
      assert.deepEqual(resumed.resident.effects, resident.effects);
    }
    assert.equal(writer.serialize(snapshotSimHostBytes(resumed.host)), writer.serialize(snapshotSimHostBytes(host)),
      'The entered, unfinished fight resumes identically through actual admission');
    assert.equal(host.flags.has('boss.nalati.king.defeated'), false, 'Entry never grants victory');
    assert.equal(host.flags.has('boss.nalati.king.paid'), false, 'Entry never grants the Golden Bow');
    console.log(`kurgan journey: ${((performance.now() - started) / 1000).toFixed(1)} s, ${host.state.tick} ticks`);
  } finally { try { resumed?.dispose(); } finally { writer.dispose(); world.dispose(); } }
});
