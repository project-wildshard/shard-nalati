// J186 Ring 2, CI only, never a hook. The Nalati stealth leg on the built
// product (meta BUILD-MAX NAL-3): from spawn through the camp gate into the
// feather-grass field, where the one-time TALL GRASS hint shows and the
// crouch disc lights; the disc latches, a jump drops the latch, holding
// crouch sinks the rider out of sight until the HUD reads Hidden, standing
// reads Visible again, and walking back out of the field takes crouch away.
// Then over the Kunes to the horse plains, where running upright at the herd
// turns the HUD Noticed, then Detected, its chevron on the horse.
// Only the inputs the page sends drive it (moves, crouch held, jump, the disc
// press). The page's own stealth law (game/stealth/stealthLaw, the core of
// stealth/controller.ts) runs beside the host as the page runs it: stepped
// with the pose the page samples, fed the native grass, herds and packs it
// observes. Nothing is written to cover, awareness, latch or state.
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
const { nativeGroupCollection } = await import('@wildshard/engine/game/shardfile/groupRuntime');
const { StealthCrouch, sampleStealthSources } = await import('@wildshard/engine/game/stealth/stealthLaw');
const { practiceRoom } = await import('@wildshard/engine/core/practiceRoom');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));

// From spawn through the camp gate to the feather grass (the engine's native stealth proof walks the same line).
const INTO_GRASS = [[20, 216], [40, 218], [60, 214], [66, 209.5], [60, 205], [45, 205], [34, 198]];
const OUT_OF_GRASS = [[45, 205], [60, 205], [66, 209.5]];
// Back past the camp, over the Kunes on the timber bridge and down the south bank's shelves to the horse plains (the
// taming journey's route, test/ci/taming-journey.test.mjs), stopping short of the herd.
const TO_PLAINS = [[60, 214], [40, 218], [20, 216], [0, 216], [0, 200], [0, 190], [0, 183], [0, 170], [0, 158], [0, 150], [0, 146],
  [1, 146], [23, 146], [27, 142], [29, 142], [30, 141], [39, 141], [40, 140], [45, 140], [46, 139], [53, 139], [54, 138],
  [55, 138], [57, 136], [57, 134], [56, 133], [40, 133], [36, 129], [32, 129], [30, 127], [15, 127], [13, 125], [11, 125], [8, 122],
  [8, 119], [9, 118], [22, 118], [25, 115], [33, 115], [35, 113], [44, 113], [48, 109], [49, 109], [50, 108], [55, 108], [57, 106],
  [57, 105], [55, 103], [38, 103], [35, 100], [28, 100], [23, 95], [18, 95], [17, 94], [15, 94], [14, 93], [14, 90], [17, 87],
  [19, 87], [20, 86], [22, 86], [23, 85], [25, 85], [30, 80], [31, 80], [32, 79], [33, 79], [36, 76], [37, 76]];
const DT = 1 / 60;

test('nalati-grasslands: hidden in the feather grass, then seen by the herd, on real inputs', { timeout: 60_000 }, async () => {
  const started = performance.now(), directory = resolve('out/nalati-grasslands'), product = await loadHeadlessProduct(directory), shard = product.shardfile;
  const descriptor = outputDescriptor(shard); assert.ok(descriptor, 'The built shard must pass admission');
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  const resident = await createTrustedHeadlessResident({ shard, assets, product, rapier }), { host } = resident;
  try {
    const rows = product.section('player/stealth'), sources = rows.observations; assert.ok(sources, 'Nalati declares its stealth observation sources');
    const groups = nativeGroupCollection(host, 'nalati.groups'), grass = groups?.environment, mounted = mountedPlayerOf(host), taming = nativeTamingOf(host);
    assert.ok(grass && mounted && taming, 'Stealth reads the native grass, herds, packs and riding owners');
    const player = [...host.players.values()][0]; assert.ok(player);
    assert.ok(Math.hypot(player.position.x - shard.spawn.x, player.position.z - shard.spawn.z) < 0.5, 'The leg starts at the shard spawn');
    // The page's stealth law beside the host: stepped each frame with the pose the page samples, then fed what it sees.
    const law = new StealthCrouch(rows, host.scope);
    let hints = 0, answer = { allowed: false, latched: false };
    const states = new Set(), maxThreat = { value: 0 };
    const step = (command, press = false) => {
      resident.step(command === undefined ? [] : [command]);
      assert.deepEqual(resident.effects, [], 'Stealth invents no quest facts');
      if (press) law.press();
      const forward = command?.steer === undefined ? 0 : command.steer.keyY + command.steer.stickY;
      law.step(DT, { sprint: command?.sprint === true && forward > 0, jump: command?.jump === true, hover: player.board.on, swimming: player.swim.on,
        practice: practiceRoom.open, crouching: mounted.rider.crouching, x: player.position.x, z: player.position.z });
      answer = law.answer({ want: command?.crouch === true, via: 'hold' });
      law.observe(host.clock.now, sampleStealthSources(sources, player, { population: groups, riding: { mounted: mounted.mounted, taming: { view: taming.view } }, grass }));
      if (law.takeHint()) hints++;
      states.add(law.state); maxThreat.value = Math.max(maxThreat.value, law.threat);
    };
    const hold = (ticks, command) => { for (let tick = 0; tick < ticks; tick++) step(command); };
    const label = () => rows.labels[law.state] ?? '';
    const walk = (route, sprint) => {
      for (const [x, z] of route) {
        const allowance = Math.max(300, Math.ceil(Math.hypot(x - player.position.x, z - player.position.z) * 90));
        let reached = false;
        for (let tick = 0; tick < allowance && !reached; tick++) {
          const dx = x - player.position.x, dz = z - player.position.z, distance = Math.hypot(dx, dz);
          if (distance < 0.4) { reached = true; break; }
          step({ kind: 'player', moveX: dx / distance, moveZ: dz / distance, yaw: Math.atan2(-dx, -dz), commandVersion: 1, sprint,
            steer: { keyX: 0, keyY: 1, stickX: 0, stickY: 0 } });
        }
        assert.ok(reached, `The walk is blocked at ${x}, ${z}: ${player.position.x}, ${player.position.z}`);
      }
    };
    const still = (fields = {}) => ({ kind: 'player', moveX: 0, moveZ: 0, yaw: 0, commandVersion: 1, steer: { keyX: 0, keyY: 0, stickX: 0, stickY: 0 }, ...fields });

    hold(60, still());
    assert.equal(law.canCrouch, false, 'The camp is no place to crouch'); assert.equal(hints, 0); assert.equal(law.state, 'none');
    walk(INTO_GRASS, false);
    hold(60, still());
    const field = { x: player.position.x, z: player.position.z, grass: law.observation.grass };
    assert.ok(field.grass >= rows.tuning.longGrass, `The field's grass stands tall: ${field.grass}`);
    assert.equal(law.canCrouch, true, 'The feather grass offers crouch'); assert.equal(law.inLongGrass, true);
    assert.equal(label(), 'Visible'); assert.equal(hints, 1, 'Entering the grass shows the one-time hint');
    // The crouch disc latches, and a real jump drops the latch.
    step(still(), true); hold(12, still());
    assert.equal(law.latched, true, 'The crouch disc latches');
    step(still({ jump: true })); hold(90, still());
    assert.equal(law.latched, false, 'A jump drops the latch');
    // Holding crouch sinks the rider into the grass until the HUD reads Hidden.
    let hiddenTick = -1;
    for (let tick = 0; tick < 300 && hiddenTick < 0; tick++) { step(still({ crouch: true })); if (law.state === 'hidden') hiddenTick = tick; }
    assert.equal(mounted.rider.crouching, true, 'Crouch held crouches the rider'); assert.equal(answer.allowed, true);
    assert.ok(hiddenTick >= 0, `Crouched in the feather grass reads Hidden: ${law.state}, cover ${law.cover}`);
    assert.equal(label(), 'Hidden'); assert.ok(law.cover >= rows.tuning.hiddenCover, `Crouched cover reaches ${rows.tuning.hiddenCover}: ${law.cover}`);
    const hiddenCover = law.cover;
    // Standing up in the same grass shows the rider again.
    hold(60, still());
    assert.equal(mounted.rider.crouching, false); assert.equal(label(), 'Visible'); assert.ok(law.cover < rows.tuning.hiddenCover, 'Standing in the grass covers less');
    // Out of the field, crouch goes away.
    walk(OUT_OF_GRASS, false);
    hold(120, still());
    assert.equal(law.canCrouch, false, 'Out of the grass, crouch goes away'); assert.equal(law.state, 'none'); assert.equal(hints, 1, 'The hint shows once');
    assert.equal(player.health.alive, true);
    // On the horse plains the HUD reads the herd: running upright through the long grass at the nearest horse, the
    // herd's awareness climbs past its notice line (Noticed) and then its alert (Detected), the chevron on that horse.
    walk(TO_PLAINS, true);
    const herd = groups.herds[0].members, away = actor => Math.hypot(actor.position.x - player.position.x, actor.position.z - player.position.z);
    const plains = host.state.tick;
    let noticedTick = -1, detectedTick = -1;
    for (let tick = 0; tick < 1500 && detectedTick < 0; tick++) {
      const horse = herd.toSorted((a, b) => away(a) - away(b))[0], dx = horse.position.x - player.position.x, dz = horse.position.z - player.position.z, distance = Math.hypot(dx, dz);
      assert.ok(distance > 4, `The herd must see the rider coming before the rider reaches it: ${law.state}`);
      step({ kind: 'player', moveX: dx / distance, moveZ: dz / distance, yaw: Math.atan2(-dx, -dz), commandVersion: 1, sprint: true,
        steer: { keyX: 0, keyY: 1, stickX: 0, stickY: 0 } });
      if (law.state === 'noticed' && noticedTick < 0) noticedTick = host.state.tick;
      if (law.state === 'detected') detectedTick = host.state.tick;
    }
    assert.ok(noticedTick > plains, 'Running at the herd reads Noticed first');
    assert.ok(detectedTick > noticedTick, `Then Detected: ${law.state}`);
    assert.equal(label(), 'Detected'); assert.equal(law.threat, 1);
    assert.ok(rows.threatStates.includes(law.state), 'Detected raises the threat chevron');
    assert.ok(herd.some(horse => Math.hypot(horse.position.x - law.threatX, horse.position.z - law.threatZ) < 1), 'The chevron points at a herd horse');
    const herdDistance = Math.round(Math.min(...herd.map(away)));
    console.log(`stealth-journey ${JSON.stringify({ field, hiddenTick, plains, noticedTick, detectedTick, herdDistance, hiddenCover: Math.round(hiddenCover * 100) / 100, states: [...states], maxThreat: Math.round(maxThreat.value * 100) / 100,
      ticks: host.state.tick, elapsedMs: Math.round(performance.now() - started) })}`);
  } finally { resident.dispose(); }
});
