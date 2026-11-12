// J186 Ring 2, CI only, never a hook. The Nalati taming leg on the built
// product: from spawn over the Kunes bridge and down the south bank's
// shelves to the horse plains, then the stallion stalked, offered to,
// mounted at its own prompt and ridden through its five bucking rounds until
// it bonds. Only the inputs the page sends drive it (running, crouch, the
// offer hold, lean and the mount press). No flag, pose, trust or taming state
// is written; the rider reads where the stallion stands and the HUD's alert
// and balance gauges, as a player's eyes do. About 6,500 ticks.
// The mounted leg goes on from the same saddle (meta BUILD-MAX NAL-2): the
// bonded tulpar is galloped west to the kokpar field on the reins alone, the
// goat snatched from the middle at speed and carried into a tai-qazan. The
// round is the shard's own chapter story, installed on the host as the
// standalone server's cell world installs it.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { createTrustedHeadlessResident } = await import('@wildshard/engine/host/headlessRuntime');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const { nativeTamingOf } = await import('@wildshard/engine/game/riding/nativeTaming');
const { mountedPlayerOf } = await import('@wildshard/engine/game/riding/native');
const { installServerChapters } = await import('@wildshard/engine/game/quest/serverChapters');
const { questBooks } = await import('@wildshard/engine/quest/players');
const { shardRows } = await import('@wildshard/engine/sim/shardRows');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));

// The taming controls the page sends (server/taming.json inputs): hold offer, lean, press mount at the prompt.
const OFFER = 'nalati.taming.offer', LEAN = 'nalati.taming.lean', MOUNT = 'nalati.taming.mount';
// Over the Kunes on the timber bridge (walk-routes.json `bridge`), then the south bank's traversable shelves to the
// plains; the straight line down the bank is too steep to walk.
const BRIDGE = [[0, 216], [0, 200], [0, 190], [0, 183], [0, 170], [0, 158], [0, 150], [0, 146]];
const BANK = [[1, 146], [23, 146], [27, 142], [29, 142], [30, 141], [39, 141], [40, 140], [45, 140], [46, 139], [53, 139], [54, 138],
  [55, 138], [57, 136], [57, 134], [56, 133], [40, 133], [36, 129], [32, 129], [30, 127], [15, 127], [13, 125], [11, 125], [8, 122],
  [8, 119], [9, 118], [22, 118], [25, 115], [33, 115], [35, 113], [44, 113], [48, 109], [49, 109], [50, 108], [55, 108], [57, 106],
  [57, 105], [55, 103], [38, 103], [35, 100], [28, 100], [23, 95], [18, 95], [17, 94], [15, 94], [14, 93], [14, 90], [17, 87],
  [19, 87], [20, 86], [22, 86], [23, 85], [25, 85], [30, 80], [31, 80], [32, 79], [33, 79], [36, 76], [37, 76], [68, 45]];
const TAMING_TICKS = 12_000;
// Crouch inside this range of the stallion, and stand still while its alert reads above HOLD.
const CREEP = 25, HOLD = 40;
// The kokpar round's allowance, and how far beside a tai-qazan's centre the rider passes: its rim stops a horse ridden
// straight in 3.61 m out, just short of the program's 3.6 m drop (behaviour/kokpar.as; product-coverage row KOK-1).
const KOKPAR_TICKS = 4_000, SIDE = 3.1;

test('nalati-grasslands: a stallion tamed on real inputs, then ridden to a kokpar win', { timeout: 90_000 }, async t => {
  const started = performance.now(), directory = resolve('out/nalati-grasslands'), product = await loadHeadlessProduct(directory), shard = product.shardfile;
  const descriptor = outputDescriptor(shard); assert.ok(descriptor, 'The built shard must pass admission');
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  const resident = await createTrustedHeadlessResident({ shard, assets, product, rapier }), { host } = resident;
  try {
    const taming = nativeTamingOf(host), mounted = mountedPlayerOf(host); assert.ok(taming); assert.ok(mounted);
    const player = [...host.players.values()][0]; assert.ok(player);
    await t.test('taming', () => {
    const stallion = [...host.entities.values()].find(actor => actor.kind === 'horse' && actor.variant === 'stallion'); assert.ok(stallion, 'The plains must hold a wild stallion');
    assert.ok(Math.hypot(player.position.x - shard.spawn.x, player.position.z - shard.spawn.z) < 0.5, 'The journey starts at the shard spawn');
    // Run (the page's sprint) to each point in turn; a point not reached in its allowance fails the route there.
    for (const [x, z] of [...BRIDGE, ...BANK]) {
      const allowance = Math.max(300, Math.ceil(Math.hypot(x - player.position.x, z - player.position.z) * 60));
      let reached = false;
      for (let tick = 0; tick < allowance && !reached; tick++) {
        const dx = x - player.position.x, dz = z - player.position.z, distance = Math.hypot(dx, dz);
        if (distance < 0.25) { reached = true; break; }
        resident.step([{ kind: 'player', moveX: dx / distance, moveZ: dz / distance, yaw: Math.atan2(-dx, -dz), commandVersion: 1, sprint: true,
          steer: { keyX: 0, keyY: 1, stickX: 0, stickY: 0 } }]);
      }
      assert.ok(reached, `The walk to the plains is blocked at ${x}, ${z}: ${player.position.x}, ${player.position.z}`);
    }
    const walkTicks = host.state.tick;
    assert.equal(player.motor.snapshot().result.grounded, true);
    assert.equal(taming.phase, 'wild'); assert.equal(taming.interactable.radius, 0, 'Walking to the plains earns no prompt');
    // Stalk: run at the stallion, crouch as it comes near and freeze while it is alert, hold the offer, press mount once
    // its prompt shows. Ride: lean against the balance gauge and its drift, read at the gauge's own 10 Hz.
    let promptTick = -1, breakingTick = -1, rounds = 0, throws = 0, balance = 0, speed = 0, sampled = 0, riding = false;
    for (let tick = 0; tick < TAMING_TICKS && taming.phase !== 'bonded'; tick++) {
      let moveX = 0, moveZ = 0, crouch = true, lean = 0;
      const gauge = taming.view.balance;
      if (taming.phase !== 'breaking') {
        if (riding) { riding = false; throws++; }
        const dx = stallion.position.x - player.position.x, dz = stallion.position.z - player.position.z, distance = Math.hypot(dx, dz);
        crouch = distance < CREEP;
        if (distance > 2.2 && !(crouch && taming.view.alert > HOLD)) { moveX = dx / distance; moveZ = dz / distance; }
      } else {
        if (!riding) { riding = true; balance = gauge; speed = 0; sampled = host.state.tick; }
        if (gauge !== balance) { speed = (gauge - balance) / ((host.state.tick - sampled) / 60); balance = gauge; sampled = host.state.tick; }
        lean = Math.max(-1, Math.min(1, balance * 4 + speed * 1.1));
        rounds = Math.max(rounds, taming.view.round ?? 0);
      }
      const prompt = taming.interactable.radius > 0;
      if (prompt && promptTick < 0) promptTick = host.state.tick;
      if (taming.phase === 'breaking' && breakingTick < 0) breakingTick = host.state.tick;
      resident.step([{ kind: 'player', moveX, moveZ, yaw: 0, commandVersion: 1, crouch, steer: { keyX: moveX, keyY: -moveZ, stickX: 0, stickY: 0 } },
        { kind: 'script', actorId: OFFER, value: 1 }, { kind: 'script', actorId: LEAN, value: lean },
        ...(prompt ? [{ kind: 'script', actorId: MOUNT, value: 1 }] : [])]);
      assert.deepEqual(resident.effects, [], 'Taming must not invent quest facts');
    }
    assert.ok(promptTick > walkTicks, 'The stalk must earn the stallion\'s prompt');
    assert.ok(breakingTick >= promptTick, 'The mount press at the prompt starts the breaking');
    assert.equal(taming.phase, 'bonded', `The stallion must bond within ${TAMING_TICKS} ticks: ${taming.snapshot()}`);
    assert.equal(rounds, 5, 'The rider sits all five bucking rounds');
    assert.equal(taming.companion?.variant, 'tulpar'); assert.equal(mounted.horse, taming.companion, 'The bonded horse carries its rider');
    assert.equal(stallion.alive, true); assert.equal(stallion.position.y, -1e4, 'The wild stallion leaves the plains');
    const flags = [...host.flags.all];
    for (const flag of ['tamed:horse', 'quest:tulpar']) assert.ok(!flags.includes(flag), `Taming alone never grants ${flag}`);
    console.log(`taming-journey ${JSON.stringify({ walkTicks, promptTick, breakingTick, bondedTick: host.state.tick, throws, elapsedMs: Math.round(performance.now() - started) })}`);
    });
    await t.test('mounted: the tulpar wins a kokpar round', async () => {
      assert.equal(taming.phase, 'bonded', 'The mounted leg rides the bonded tulpar');
      const begun = performance.now(), filed = [];
      assert.equal(await installServerChapters(host, product, shard, (fact, entity) => { filed.push([fact, entity]); }), true, 'Nalati runs its story and kokpar on the server');
      const book = questBooks(host).lead, carried = await product.json((await product.json('quests/content.json')).view.carried);
      const [home, goals] = [carried.home, carried.goals];
      // The reins: stick forward to go, stick sideways to turn, sprint to gallop; the yaw is the camera behind the horse.
      const reins = (forward, turn, sprint) => ({ kind: 'player', moveX: 0, moveZ: 0, yaw: mounted.body.heading - Math.PI, commandVersion: 1, sprint,
        steer: { keyX: 0, keyY: 0, stickX: Math.max(-1, Math.min(1, turn)), stickY: forward } });
      const toward = (x, z, brakes) => {
        const p = player.position, target = Math.atan2(x - p.x, z - p.z), delta = Math.atan2(Math.sin(mounted.body.heading - target), Math.cos(mounted.body.heading - target));
        const brake = brakes && Math.abs(delta) > .9 && mounted.body.speed > 4;
        return { distance: Math.hypot(x - p.x, z - p.z), command: reins(brake ? -.3 : Math.abs(delta) > .9 ? 0 : 1, brake ? 0 : delta * 2.5, !brake) };
      };
      // The field is a line: one tai-qazan, the goat in the middle, the other tai-qazan. Line up beyond the near one, then
      // gallop the line through the goat into the far one without slowing: a slow rider has the goat snatched back.
      const [near, far] = goals.toSorted((a, b) => Math.hypot(a.x - player.position.x, a.z - player.position.z) - Math.hypot(b.x - player.position.x, b.z - player.position.z));
      const lineUp = { x: home.x + (near.x - home.x) * 1.6, z: home.z + (near.z - home.z) * 1.6 };
      // A tai-qazan's rim stops a horse ridden straight at it short of the drop; ride on past its side, close enough to drop.
      const along = Math.hypot(far.x - home.x, far.z - home.z), dx = (far.x - home.x) / along, dz = (far.z - home.z) / along;
      const past = { x: far.x - dz * SIDE + dx * 8, z: far.z + dx * SIDE + dz * 8 };
      // Where the goat stands for this rider, as the page reads it off the owned rows: 0 home, 1 carried, 2 + a goal.
      const goat = () => { const out = new Map(); shardRows(host).owned.get('story')?.(player.id, out); return out.get('story.prop') ?? 0; };
      const start = host.state.tick;
      let pickupTick = -1, wonTick = -1, topSpeed = 0, lined = false, snatched = 0;
      for (let tick = 0; tick < KOKPAR_TICKS && wonTick < 0; tick++) {
        assert.equal(mounted.mounted, true, 'The rider stays in the saddle');
        assert.equal(mounted.horse, taming.companion, 'The bonded tulpar carries the rider throughout');
        const held = goat();
        if (!lined) { const leg = toward(lineUp.x, lineUp.z, true); lined = leg.distance < 4; resident.step([leg.command]); }
        else resident.step([toward(past.x, past.z, false).command]);
        assert.deepEqual(resident.effects, [], 'The ride invents no quest facts');
        topSpeed = Math.max(topSpeed, mounted.body.speed);
        const now = goat();
        if (now === 1 && held !== 1 && pickupTick < 0) pickupTick = host.state.tick;
        if (now === 0 && held === 1) { snatched++; lined = false; }
        if (book.flags.has('won:kokpar')) wonTick = host.state.tick;
      }
      assert.ok(pickupTick > start, `The tulpar must reach the goat and snatch it: ${player.position.x}, ${player.position.z}`);
      assert.ok(wonTick > pickupTick, `The goat must land in a tai-qazan within ${KOKPAR_TICKS} ticks: ${player.position.x}, ${player.position.z}`);
      assert.ok(topSpeed >= 11, 'The kokpar is won at a gallop');
      assert.ok(goat() >= 2, 'The goat rests in a tai-qazan'); assert.equal(snatched, 0, 'No rider snatches the goat back');
      console.log(`kokpar ${JSON.stringify({ startTick: start, pickupTick, wonTick, topSpeed: Math.round(topSpeed * 10) / 10, snatched, goat: goat(), filed, elapsedMs: Math.round(performance.now() - begun) })}`);
    });
  } finally { resident.dispose(); }
});
