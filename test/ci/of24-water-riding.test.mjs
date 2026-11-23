// Ring 2: compare the real built world with its original explicit host routes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boot } from './journey-rider.mjs';

const { NATIVE_ASSEMBLY_FILE } = await import('@wildshard/format/nativeAssembly');
const { runNativeHeadlessTape } = await import('@wildshard/sdk/headless/host/headlessTape');
const { actRoutes } = await import('@wildshard/sdk/internal/engine/sim/actRoutes');
const { openWorld } = await import('@wildshard/sdk/internal/engine/host/openWorld');
const { createSimSnapshotSerializer, snapshotSimHostBytes } = await import('@wildshard/sdk/headless/sim/snapshot');
const { nativeTamingOf } = await import('@wildshard/sdk/internal/engine/game/riding/nativeTaming');
const { mountedPlayerOf } = await import('@wildshard/sdk/internal/engine/game/riding/native');

test('Nalati water and riding rows preserve the original native world', { timeout: 180_000 }, async () => {
  const { input, world } = await boot();
  const { product } = input;
  const writer = createSimSnapshotSerializer();
  let legacy, restored;
  try {
    const decoder = new TextDecoder(), encoder = new TextEncoder();
    const plan = JSON.parse(decoder.decode(await product.file(NATIVE_ASSEMBLY_FILE)));
    const profile = JSON.parse(decoder.decode(await product.file('server/ride.json')));
    const bootRows = JSON.parse(decoder.decode(await product.file('server/boot.json')));
    const mount = input.shard.rows.species.find(row => row.kind === profile.adopted.kind)?.mount;
    assert.equal(plan.field, undefined);
    assert.equal(profile.speeds, undefined);
    assert.equal(bootRows.mountable, undefined);
    assert.deepEqual(profile.mountable, ['creature:21', 'creature:22']);
    assert.deepEqual(mount?.gaits, input.shard.modes.ride[0].gaits);
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
    const { mountable, ...priorProfile } = profile;
    const oldProfile = encoder.encode(JSON.stringify({ ...priorProfile, speeds: input.shard.modes.ride[0].gaits }));
    const oldBoot = { ...bootRows, mountable };
    legacy = await openWorld({ ...input, product: {
      ...product,
      file: name => name === NATIVE_ASSEMBLY_FILE ? Promise.resolve(oldPlan)
        : name === 'server/ride.json' ? Promise.resolve(oldProfile)
          : product.file(name),
      // Patrol assembly lends species through json() before handing boot bytes to the roster.
      json: name => name === 'server/boot.json' ? Promise.resolve(structuredClone(oldBoot)) : product.json(name),
    } }, { room: true });
    const save = resident => writer.serialize(snapshotSimHostBytes(resident.host));
    assert.ok(save(world) === save(legacy), 'Whole saves match across both mount paths');
    assert.equal(nativeTamingOf(world.host)?.phase, 'wild');
    assert.deepEqual(mountedPlayerOf(world.host)?.speeds, mount.gaits);
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
    assert.ok(save(world) === save(legacy), 'Whole saves match across both mount paths');
    restored = await openWorld(input, { room: true, snapshot: save(world) });
    for (let tick = 0; tick < 5; tick++) {
      world.resident.step(walk);
      legacy.resident.step(walk);
      restored.resident.step(walk);
      assert.deepEqual(restored.resident.effects, world.resident.effects);
      assert.ok(save(restored) === save(world), 'The exact continuation survives restore');
    }
    const road = [[20,216],[40,218],[60,214],[66,209.5],[73,206.1],[83,206],[84.8,203.8],[88,204.5],[95,204],[94,210],[91,216],
      [86.6,219.5],[91,216],[94,210],[94,208.5],[88,207],[83,206],[73,206.1],[72.4,212.9],[72,210],[68,210],[66,211.5],[67.5,213.7]];
    const segments = [{ id: 'walk-to-camp-horse', ticks: 7200, commands: [], route: road.map(([x,z]) => ({ x,z })) }];
    const step = commands => { world.resident.step(commands); legacy.resident.step(commands); };
    runNativeHeadlessTape(world.host, step, () => world.resident.effects, { version: 1, observe: [], segments });
    const ride = action => {
      for (const candidate of [world, legacy]) {
        const route = actRoutes(candidate.host).ride;
        assert.ok(route, 'The room registers its ride network handler');
        route([...candidate.host.players.keys()][0], action);
      }
      step([]);
    };
    const rider = mountedPlayerOf(world.host);
    const player = [...world.host.players.values()][0];
    const approach = JSON.stringify({ player: player.position, mounts: rider?.mountables.map(actor => ({ id: actor.entityId, at: actor.position, alive: actor.alive })) });
    ride('mount');
    assert.equal(rider?.mounted, true, `The authored camp mount is within reach: ${approach}`);
    assert.ok(save(world) === save(legacy), 'Whole saves match across both mount paths');
    for (let tick = 0; tick < 90; tick++) step([{ kind: 'player', moveX: 0, moveZ: 0, yaw: player.yaw, commandVersion: 1,
      steer: { keyX: 0, keyY: -1, stickX: 0, stickY: 0 } }]);
    assert.ok(rider.body.speed < 0, 'Native reins back the horse clear of the rail');
    const reverseSpeed = rider.body.speed;
    ride('dismount');
    assert.equal(rider.mounted, false);
    assert.ok(save(world) === save(legacy), 'Whole saves match across both mount paths');
    console.log(JSON.stringify({ waterSamples: { wet, dry }, ticks: world.host.state.tick, exactRestore: true, reverseSpeed, campRide: true }));
  } finally {
    restored?.dispose();
    legacy?.dispose();
    world.dispose();
    writer.dispose();
  }
});
