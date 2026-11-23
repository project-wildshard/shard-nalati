import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './journey-rider.mjs';

const { NATIVE_ASSEMBLY_FILE } = await import('@wildshard/format/nativeAssembly');
const { openWorld } = await import('@wildshard/sdk/internal/engine/host/openWorld');
const { actRoutes } = await import('@wildshard/sdk/internal/engine/sim/actRoutes');
const { openArenaOf } = await import('@wildshard/sdk/internal/engine/game/boss/openArenaNative');
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/sdk/headless/sim/snapshot');

test('the cooked weather files keep the native storm through save and restore', { timeout: 180_000 }, async () => {
  const { input, world } = await boot();
  const { product } = input;
  const writer = createSimSnapshotSerializer();
  let legacy, restored;
  try {
    const plan = JSON.parse(new TextDecoder().decode(await product.file(NATIVE_ASSEMBLY_FILE)));
    assert.ok(plan.features.every(row => row.host !== 'weather.native' && row.host !== 'weather.program'));
    const environment = plan.features.findIndex(row => row.host === 'riding.environment');
    assert.notEqual(environment, -1);
    assert.equal(product.hasFile('server/shelters.json'), false);
    assert.equal(product.hasFile('server/weather.json'), false);
    const { storm: { world: stormWorld, shelters } } = await product.json('world/forest-weather.json');
    assert.equal(shelters.length, 9, 'the original cooked shelter circles are present');
    const features = plan.features.map(row => row.host === 'held.arms' ? { ...row, weather: { file: 'server/weather.json' } } : row);
    features.splice(environment + 1, 0, { host: 'weather.native', program: { file: 'world/weather.json' },
      shelters: { file: 'server/shelters.json' }, rows: { file: 'server/weather.json' } });
    const encode = value => new TextEncoder().encode(JSON.stringify(value));
    const oldFiles = new Map([[NATIVE_ASSEMBLY_FILE, encode({ ...plan, features })], ['server/weather.json', encode(stormWorld)], ['server/shelters.json', encode(shelters)]]);
    legacy = await openWorld({ ...input, product: { ...product,
      hasFile: name => oldFiles.has(name) || product.hasFile(name),
      file: name => {
        const bytes = oldFiles.get(name);
        return bytes === undefined ? product.file(name) : Promise.resolve(bytes);
      },
    } }, { room: true });
    const save = resident => writer.serialize(snapshotSimHostBytes(resident.host));
    const storm = resident => {
      const arena = openArenaOf(resident.host);
      assert.ok(arena, 'The room has its Storm Titan arena');
      return arena.storm();
    };
    assert.ok(save(world) === save(legacy), 'The two install sequences save identically');
    for (const candidate of [world, legacy]) {
      assert.equal(storm(candidate), false);
      const climate = actRoutes(candidate.host).climate;
      assert.ok(climate);
      // Use the ordinary Storm setting, the same route the mounted journey plays.
      climate({ op: 'mode', name: 'storm', at: -1 });
    }
    for (let tick = 0; tick < 180; tick++) {
      world.resident.step([]);
      legacy.resident.step([]);
      assert.equal(storm(world), storm(legacy));
    }
    assert.equal(storm(world), true);
    const stormTick = world.host.state.tick, stormSave = save(world);
    assert.ok(stormSave === save(legacy), 'The active storm saves identically');
    restored = await openWorld(input, { room: true, snapshot: stormSave });
    for (let tick = 0; tick < 5; tick++) {
      world.resident.step([]);
      restored.resident.step([]);
      assert.equal(storm(restored), storm(world));
      assert.deepEqual(restored.resident.effects, world.resident.effects);
      assert.ok(save(restored) === save(world), 'The active storm continuation saves identically');
    }
    console.log(JSON.stringify({ stormTick, restoredUntil: world.host.state.tick, exactContinuation: true }));
  } finally {
    restored?.dispose();
    legacy?.dispose();
    world.dispose();
    writer.dispose();
  }
});
