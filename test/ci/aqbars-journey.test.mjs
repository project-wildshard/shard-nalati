// J186 Ring 2, CI only, never a hook. The Nalati elite leg on the built product
// (meta TEST-COVERAGE SHARD-REPOS SH-nalati-1..5, HOW-WE-BUILD NAL-4): from
// spawn over the Kunes bridge, down the south bank's shelves and across the
// horse plains to the foot of the crags, where Aqbars the Pale sees the
// player, comes down from her lair and is felled with the sabre. The world is
// a room's (the fights a room runs: held arms, elites), and only what the page
// sends drives it: movement frames, the weapon swap, the camera pitch the
// swing follows, a held heavy swing and the sabre tap. The player reads the
// cat's body (where she stands, her head, her swing) as a player's eyes do.
// Her swipes are real: each one the player's blows break before it lands
// leaves her staggered. Up on a ledge she is out of reach, so the player
// stands off and circles until she comes down; her pounces are not dodged.
// Nothing writes her health, state or record: the elite core files the kill
// once and starts her lair's respawn clock. Her rows are read from the product.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { openWorld } = await import('@wildshard/engine/host/openWorld');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));

// Over the Kunes on the timber bridge, the south bank's shelves to the horse plains (the taming journey's route,
// test/ci/taming-journey.test.mjs), then south-east over the plains to the foot of Aqbars' crags.
const ROUTE = [[20, 216], [10, 216], [0, 216], [0, 200], [0, 190], [0, 183], [0, 170], [0, 158], [0, 150], [0, 146],
  [1, 146], [23, 146], [27, 142], [29, 142], [30, 141], [39, 141], [40, 140], [45, 140], [46, 139], [53, 139], [54, 138],
  [55, 138], [57, 136], [57, 134], [56, 133], [40, 133], [36, 129], [32, 129], [30, 127], [15, 127], [13, 125], [11, 125], [8, 122],
  [8, 119], [9, 118], [22, 118], [25, 115], [33, 115], [35, 113], [44, 113], [48, 109], [49, 109], [50, 108], [55, 108], [57, 106],
  [57, 105], [55, 103], [38, 103], [35, 100], [28, 100], [23, 95], [18, 95], [17, 94], [15, 94], [14, 93], [14, 90], [17, 87],
  [19, 87], [20, 86], [22, 86], [23, 85], [25, 85], [30, 80], [31, 80], [32, 79], [33, 79], [36, 76], [37, 76], [68, 45],
  [80, 30], [95, 10], [105, -10], [115, -30], [118, -40]];
const ELITES = 'nalati.elites', WEAPONS = 'nalati.weapons';
const SWAP = 'nalati.weapon.swap', ATTACK = 'nalati.weapon.attack', PITCH = 'nalati.weapon.pitch';
// The page's camera height over the feet, which the swing's pitch is aimed from (the engine's King proof aims the same way).
const EYE = 1.68;
const FIGHT_TICKS = 6_000, SETTLE_TICKS = 600;
// How far above the player's feet her feet must be to read as up on a ledge, and where the player then stands off.
const PERCHED = 1.5, STAND_OFF = 8;
// How long after the last swing input its blow may still land (a released heavy swing and the combo's recovery).
const SWING_TICKS = 60;

test('nalati-grasslands: Aqbars the Pale felled at her crags on real inputs', { timeout: 60_000 }, async () => {
  const started = performance.now(), directory = resolve('out/nalati-grasslands'), product = await loadHeadlessProduct(directory), shard = product.shardfile;
  const descriptor = outputDescriptor(shard); assert.ok(descriptor, 'The built shard must pass admission');
  const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
    .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
  const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
  // Her declared rows: the lair she leashes to and the swipe whose contacts the player's blows must beat.
  const elites = await product.json('server/elites.json'), at = elites.rows.findIndex(row => row.def.id === 'aqbars');
  const def = elites.rows[at]?.def, swipe = elites.kernels.find(kernel => kernel.id === 'aqbars')?.profile.spec.swipe;
  assert.ok(def && swipe, 'The product declares Aqbars and her swipe');
  const { resident } = await openWorld({ shard, assets, product, rapier }, { room: true }), { host } = resident;
  try {
    const player = [...host.players.values()][0]; assert.ok(player);
    assert.ok(Math.hypot(player.position.x - shard.spawn.x, player.position.z - shard.spawn.z) < 0.5, 'The journey starts at the shard spawn');
    const cat = [...host.entities.values()].find(actor => actor.kind === 'leopard' && actor.variant === 'aqbars'); assert.ok(cat, 'Aqbars must keep her lair');
    // The elite and weapon owners' own continuations, read as a save would read them.
    const owned = id => { const owner = host.adapters.get(id); assert.ok(owner, `Missing ${id}`); const saved = owner.snapshot(); return typeof saved === 'string' ? JSON.parse(saved) : saved; };
    const record = () => owned(ELITES).records.aqbars, entry = () => owned(ELITES).entries.find(row => row.id === 'aqbars');
    const health = () => player.health.attributes.health, full = player.health.attributes.maxHealth;
    assert.equal(cat.alive, true); assert.equal(cat.hp, cat.maxHp, 'She is unhurt before the walk'); assert.equal(health(), full);
    assert.equal(record().kills, 0, 'No kill is filed before the fight'); assert.equal(entry().state, 'idle', 'She waits in her lair');
    // HS1: the room's world files feats (data/feats.json) as Ledger facts; Aqbars pays no coins.
    const effects = [];
    const step = commands => { resident.step(commands); effects.push(...resident.effects); };
    const frame = (fields = {}) => ({ kind: 'player', moveX: 0, moveZ: 0, yaw: 0, commandVersion: 1, steer: { keyX: 0, keyY: 0, stickX: 0, stickY: 0 }, ...fields });

    // Run (the page's sprint) to each point in turn; a point not reached in its allowance fails the route there.
    for (const [x, z] of ROUTE) {
      const allowance = Math.max(300, Math.ceil(Math.hypot(x - player.position.x, z - player.position.z) * 60));
      let reached = false;
      for (let tick = 0; tick < allowance && !reached; tick++) {
        const dx = x - player.position.x, dz = z - player.position.z, distance = Math.hypot(dx, dz);
        if (distance < 0.4) { reached = true; break; }
        step([frame({ moveX: dx / distance, moveZ: dz / distance, yaw: Math.atan2(-dx, -dz), sprint: true, steer: { keyX: 0, keyY: 1, stickX: 0, stickY: 0 } })]);
      }
      assert.ok(reached, `The walk to the crags is blocked at ${x}, ${z}: ${player.position.x}, ${player.position.z}`);
    }
    const walkTicks = host.state.tick;
    assert.equal(cat.hp, cat.maxHp, 'The walk does not hurt her'); assert.equal(health(), full, 'The walk does not hurt the player');
    assert.equal(entry().state, 'aware', 'At the foot of the crags she has seen the player, not yet engaged');
    // The sabre is the next slot: the page's swap press, until the weapon owner says it is in hand.
    for (let press = 0; press < 3 && owned(WEAPONS).slot !== 'blade'; press++) { step([frame(), { kind: 'script', actorId: SWAP, value: 1 }]); for (let tick = 0; tick < 20; tick++) step([frame()]); }
    assert.equal(owned(WEAPONS).slot, 'blade', 'The swap puts the sabre in hand');

    // The fight: close on her, hold heavy swings and tap the sabre, the camera pitched at her head.
    const fightStart = host.state.tick, head = cat.position.clone(), swipes = [];
    let engagedTick = -1, killTick = -1, perchTicks = 0, taps = 0, hurtTicks = 0, lowest = health(), swiping = null, lastHp = cat.hp, lastSwing = -Infinity;
    for (let tick = 0; tick < FIGHT_TICKS && cat.alive; tick++) {
      if (engagedTick < 0 && entry().state === 'engaged') engagedTick = host.state.tick;
      const dx = cat.position.x - player.position.x, dz = cat.position.z - player.position.z, d = Math.hypot(dx, dz);
      cat.headWorld(head);
      const gaze = Math.hypot(head.x - player.position.x, head.z - player.position.z), pitch = Math.atan2(head.y - player.position.y - EYE, Math.max(0.3, gaze));
      const yaw = Math.atan2(-dx, -dz), perched = cat.position.y - player.position.y > PERCHED;
      let command, swinging = false;
      if (perched) {
        // Up on a ledge she is out of the sabre's reach: stand off in the open, circling, until she comes down.
        const out = d < STAND_OFF - 1 ? -1 : d > STAND_OFF + 1 ? 1 : 0;
        const moveX = out * dx / d - dz / d * 0.8, moveZ = out * dz / d + dx / d * 0.8, length = Math.hypot(moveX, moveZ);
        command = frame({ yaw, moveX: moveX / length, moveZ: moveZ / length, steer: { keyX: 0, keyY: 1, stickX: 0, stickY: 0 } });
        perchTicks++;
      } else {
        const toward = d > swipe.from - 0.2;
        command = frame({ yaw, moveX: toward ? dx / d : 0, moveZ: toward ? dz / d : 0, steer: { keyX: 0, keyY: toward ? 1 : 0, stickX: 0, stickY: 0 } });
        if (d < swipe.range + 0.6 && tick % 75 < 45) { command.heavy = {}; swinging = true; }
      }
      const tap = !perched && d < swipe.range && tick % 30 === 0; if (tap) { taps++; swinging = true; }
      step([command, ...(tap ? [{ kind: 'script', actorId: ATTACK, value: 1 }] : []), ...(tick % 12 === 0 ? [{ kind: 'script', actorId: PITCH, value: pitch }] : [])]);
      // Every blow she takes lands while a swing the player pressed or held in reach plays out.
      if (swinging) lastSwing = host.state.tick;
      if (cat.hp < lastHp) { hurtTicks++; assert.ok(host.state.tick - lastSwing <= SWING_TICKS, `She is hurt only by the player's swings: tick ${host.state.tick}, last swing ${lastSwing}`); }
      lastHp = cat.hp;
      // Her swipes, as her body plays them: each one's furthest phase and whether she is staggered when it stops.
      const phase = cat.attackPhase;
      if (phase >= 0) { if (swiping === null) { swiping = { tick: host.state.tick, reached: 0 }; swipes.push(swiping); } swiping.reached = Math.max(swiping.reached, phase); }
      else if (swiping !== null) { swiping.staggered = cat.stunT > 0; swiping = null; }
      lowest = Math.min(lowest, health());
      if (!cat.alive) killTick = host.state.tick;
    }
    assert.ok(engagedTick > walkTicks, 'She comes down and engages the player');
    assert.equal(cat.alive, false, `The player fells Aqbars: ${cat.hp} hp left after ${taps} taps`);
    assert.ok(hurtTicks > 0);
    const lairDistance = Math.hypot(cat.position.x - def.lair.x, cat.position.z - def.lair.z);
    assert.ok(lairDistance < def.leashR, `She falls inside her leash: ${lairDistance.toFixed(1)} m from her lair`);
    // She fights back: she starts swipes in reach, and each is broken by the player's blows before its first contact
    // lands, leaving her staggered; so the player wins at full health and never dies.
    assert.ok(swipes.length > 0, 'She swipes at the player');
    for (const row of swipes) {
      assert.ok(row.reached < swipe.first, `A swipe at tick ${row.tick} reached its contact (${row.reached.toFixed(2)}) before the player broke it`);
      assert.equal(row.staggered, true, `The blow that broke the swipe at tick ${row.tick} staggers her`);
    }
    assert.equal(lowest, full, 'No swipe lands'); assert.equal(host.flags.has('dead:actor.player'), false, 'The player wins without dying');
    // The elite core files the kill once and starts the lair's respawn clock; playing on files nothing more.
    for (let tick = 0; tick < SETTLE_TICKS; tick++) step([frame()]);
    const filed = record(), settled = entry();
    assert.equal(filed.kills, 1, 'The kill is filed once'); assert.equal(filed.discovered, true);
    assert.equal(settled.state, 'dead', 'Her lair is empty');
    assert.ok(filed.timer > def.respawnMin * 60 - 60 && filed.timer <= def.respawnMin * 60, `Her lair waits ${def.respawnMin} minutes to wake again: ${filed.timer}`);
    assert.deepEqual(effects.map(effect => effect.kind === 'fact' ? effect.name : effect.kind), ['nalati.feat.aqbars'], 'Aqbars pays no coins; the room files her feat once');
    console.log(`aqbars-journey ${JSON.stringify({ walkTicks, engagedTick, killTick, fightTicks: killTick - fightStart, taps, hurtTicks, swipes: swipes.length, perchTicks,
      lairDistance: Math.round(lairDistance), respawn: Math.round(filed.timer), ticks: host.state.tick, elapsedMs: Math.round(performance.now() - started) })}`);
  } finally { resident.dispose(); }
});
