// Ring 2: compare the real built world with its original explicit host routes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './journey-rider.mjs';

const { NATIVE_ASSEMBLY_FILE } = await import('@wildshard/format/nativeAssembly');
const { openWorld } = await import('@wildshard/engine/host/openWorld');
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/engine/sim/snapshot');
const { nativeTamingOf } = await import('@wildshard/engine/game/riding/nativeTaming');
const { mountedPlayerOf } = await import('@wildshard/engine/game/riding/native');

test('Nalati water and riding rows preserve the original native world', { timeout: 60_000 }, async () => {
  const { input, world } = await boot();
  const { product } = input;
  const writer = createSimSnapshotSerializer();
  let legacy, restored;
  try {
    const decoder = new TextDecoder(), encoder = new TextEncoder();
    const plan = JSON.parse(decoder.decode(await product.file(NATIVE_ASSEMBLY_FILE)));
    const profile = JSON.parse(decoder.decode(await product.file('server/ride.json')));
    assert.equal(plan.field, undefined);
    assert.equal(profile.speeds, undefined);
    assert.ok(plan.features.every(row => row.host !== 'water.field' && row.host !== 'riding.taming'));

    const features = [...plan.features];
    features.splice(1, 0, { host: 'water.field' });
    const ready = features.findIndex(row => row.host === 'riding.elites-ready');
    assert.ok(ready > 0);
    features.splice(ready, 0, {
      host: 'riding.taming',
      rows: { file: 'server/taming.json' },
      poses: { file: 'sim/taming-poses.json', path: ['poses'] },
      pose: { file: 'actors/species-looks.json', path: ['poses', 'horse'] },
    });
    const field = { rows: { file: 'world/meadow.json' }, pond: 'data/geography-pond.bin' };
    const oldPlan = encoder.encode(JSON.stringify({ ...plan, features, field }));
    const oldProfile = encoder.encode(JSON.stringify({ ...profile, speeds: input.shard.modes.ride[0].gaits }));
    legacy = await openWorld({ ...input, product: {
      ...product,
      file: name => name === NATIVE_ASSEMBLY_FILE ? Promise.resolve(oldPlan)
        : name === 'server/ride.json' ? Promise.resolve(oldProfile) : product.file(name),
    } }, { room: true });
    const save = resident => writer.serialize(snapshotSimHostBytes(resident.host));
    assert.equal(save(world), save(legacy));
    assert.equal(nativeTamingOf(world.host)?.phase, 'wild');
    assert.deepEqual(mountedPlayerOf(world.host)?.mountables.map(actor => actor.entityId), ['creature:21', 'creature:22']);

    let wet = 0, dry = 0;
    for (let x = -247.5; x <= 250; x += 5) for (let z = -247.5; z <= 250; z += 5) {
      const height = world.host.waterSurfaceAt(x, z);
      assert.equal(height, legacy.host.waterSurfaceAt(x, z), `Surface at ${x}, ${z}`);
      if (height === null) dry++;
      else wet++;
    }
    assert.ok(wet > 0 && dry > 0);
    assert.equal(wet + dry, 10_000);

    const walk = [{ kind: 'player', moveX: 0, moveZ: -1, yaw: 0 }];
    for (let tick = 0; tick < 120; tick++) {
      world.resident.step(walk);
      legacy.resident.step(walk);
    }
    assert.equal(save(world), save(legacy));
    restored = await openWorld(input, { room: true, snapshot: save(world) });
    for (let tick = 0; tick < 5; tick++) {
      world.resident.step(walk);
      restored.resident.step(walk);
      assert.deepEqual(restored.resident.effects, world.resident.effects);
      assert.equal(save(restored), save(world));
    }
    console.log(JSON.stringify({ waterSamples: { wet, dry }, ticks: world.host.state.tick, exactRestore: true }));
  } finally {
    restored?.dispose();
    legacy?.dispose();
    world.dispose();
    writer.dispose();
  }
});
