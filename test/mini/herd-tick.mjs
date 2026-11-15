// Mac mini report, never CI or a hook (meta SHARD-REPOS SH-nalati-8): the server's tick time near Nalati's live herd, on
// the real path. The room's world (`openWorld(..., {room: true})`, the world the grid server ticks) is opened from the
// built product, the player runs from spawn over the Kunes bridge and down the south bank's shelves to the horse plains
// on the inputs the page sends, then chases the nearest herd (it bolts from a runner) for HERD_TICKS. Every
// `resident.step` is timed.
//
//   node test/mini/herd-tick.mjs            report, and compare with this machine's recorded baseline
//   node test/mini/herd-tick.mjs --record   write this machine's baseline (a reviewed one-line change)
//
// It reports, it never blocks a push: exit 2 when the near-herd p95 is more than WORSE x its baseline, or the herd is
// not near the player for most of the window; exit 1 when a run has no baseline entry yet. The budgets it prints are the
// server's 60 ticks/s (16.67 ms) and MMO MP1.2's 10 ms bar. These are this machine's numbers, not the VPS's.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { arch, cpus, platform } from 'node:os';
import { join, resolve } from 'node:path';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { openWorld } = await import('@wildshard/engine/host/openWorld');
const { outputDescriptor, serverReadsFile } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { loadRapier } = await import('@wildshard/engine/physics/rapier');
const engineRequire = createRequire(import.meta.resolve('@wildshard/engine/package.json'));

// The bridge and the bank's traversable shelves to the plains (walk-routes.json `bridge`; the taming journey's route).
const ROUTE = [[0, 216], [0, 200], [0, 190], [0, 183], [0, 170], [0, 158], [0, 150], [0, 146],
  [1, 146], [23, 146], [27, 142], [29, 142], [30, 141], [39, 141], [40, 140], [45, 140], [46, 139], [53, 139], [54, 138],
  [55, 138], [57, 136], [57, 134], [56, 133], [40, 133], [36, 129], [32, 129], [30, 127], [15, 127], [13, 125], [11, 125], [8, 122],
  [8, 119], [9, 118], [22, 118], [25, 115], [33, 115], [35, 113], [44, 113], [48, 109], [49, 109], [50, 108], [55, 108], [57, 106],
  [57, 105], [55, 103], [38, 103], [35, 100], [28, 100], [23, 95], [18, 95], [17, 94], [15, 94], [14, 93], [14, 90], [17, 87],
  [19, 87], [20, 86], [22, 86], [23, 85], [25, 85], [30, 80], [31, 80], [32, 79], [33, 79], [36, 76], [37, 76], [68, 45]];
const WARMUP = 120, SPAWN_TICKS = 600, HERD_TICKS = 1800, NEAR = 40, FOLLOW = 15, GROUP = 30, WORSE = 1.25, TICK_MS = 1000 / 60, BAR_MS = 10;
const BASELINES = new URL('./herd-tick-baselines.json', import.meta.url);

const stats = samples => {
  const sorted = [...samples].sort((a, b) => a - b), at = q => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))] ?? 0;
  const round = value => Math.round(value * 1000) / 1000;
  return { ticks: sorted.length, p50: round(at(0.5)), p95: round(at(0.95)), p99: round(at(0.99)), max: round(sorted.at(-1) ?? 0),
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length)),
    over16: sorted.filter(value => value > TICK_MS).length, over10: sorted.filter(value => value > BAR_MS).length };
};

const directory = resolve('out/nalati-grasslands');
if (!existsSync(directory)) throw new Error('Build the shard first: pnpm build:shards');
const opened = performance.now(), product = await loadHeadlessProduct(directory), shard = product.shardfile, descriptor = outputDescriptor(shard);
if (!descriptor) throw new Error('The built shard must pass admission');
const assets = new Map(descriptor.index.files.filter(file => serverReadsFile(file, shard.terrain?.collider) && (file.name === undefined || file.kind === 'wasm' || file.kind === 'tile'))
  .map(file => [file.commons === true ? `commons:${file.hash}` : file.hash, readFileSync(join(directory, file.path))]));
const rapier = await loadRapier(readFileSync(engineRequire.resolve('@dimforge/rapier3d-simd/rapier_wasm3d_bg.wasm')));
const { resident } = await openWorld({ shard, assets, product, rapier }, { room: true }), { host } = resident;
const openMs = performance.now() - opened;
try {
  const player = [...host.players.values()][0];
  if (!player) throw new Error('The room world has no player');
  const horses = () => [...host.entities.values()].filter(actor => actor.kind === 'horse' && actor.alive !== false && actor.position.y > -1000);
  const timed = commands => { const started = performance.now(); resident.step(commands); return performance.now() - started; };
  const idle = [{ kind: 'player', moveX: 0, moveZ: 0, yaw: 0, commandVersion: 1, steer: { keyX: 0, keyY: 0, stickX: 0, stickY: 0 } }];
  const run = (dx, dz, sprint) => { const distance = Math.hypot(dx, dz);
    return [{ kind: 'player', moveX: dx / distance, moveZ: dz / distance, yaw: Math.atan2(-dx, -dz), commandVersion: 1, sprint, steer: { keyX: 0, keyY: 1, stickX: 0, stickY: 0 } }]; };

  for (let tick = 0; tick < WARMUP; tick++) timed(idle);
  const spawn = []; for (let tick = 0; tick < SPAWN_TICKS; tick++) spawn.push(timed(idle));

  const walk = [];
  for (const [x, z] of ROUTE) {
    const allowance = Math.max(300, Math.ceil(Math.hypot(x - player.position.x, z - player.position.z) * 60));
    let reached = false;
    for (let tick = 0; tick < allowance; tick++) {
      const dx = x - player.position.x, dz = z - player.position.z;
      if (Math.hypot(dx, dz) < 0.25) { reached = true; break; }
      walk.push(timed(run(dx, dz, true)));
    }
    if (!reached) throw new Error(`The run to the plains is blocked at ${x}, ${z}: ${player.position.x.toFixed(1)}, ${player.position.z.toFixed(1)}`);
  }

  // The plains herd bolts from a running player. Follow the nearest horse's own group (every horse within GROUP m of it) at
  // a run, standing once within FOLLOW m of its middle, as a player chasing it does: the herd's AI stays near a player.
  const herd = [], near = [];
  const away = horse => Math.hypot(horse.position.x - player.position.x, horse.position.z - player.position.z);
  for (let tick = 0; tick < HERD_TICKS; tick++) {
    const live = horses(), close = live.filter(horse => away(horse) < NEAR);
    near.push(close.length);
    const nearest = live.reduce((best, horse) => best === undefined || away(horse) < away(best) ? horse : best, undefined);
    const group = nearest === undefined ? [] : live.filter(horse => Math.hypot(horse.position.x - nearest.position.x, horse.position.z - nearest.position.z) < GROUP);
    const cx = group.reduce((sum, horse) => sum + horse.position.x, 0) / Math.max(1, group.length), cz = group.reduce((sum, horse) => sum + horse.position.z, 0) / Math.max(1, group.length);
    const dx = cx - player.position.x, dz = cz - player.position.z;
    herd.push(timed(group.length > 0 && Math.hypot(dx, dz) > FOLLOW ? run(dx, dz, true) : idle));
  }
  const nearTicks = near.filter(count => count > 0).length;
  const engine = JSON.parse(readFileSync(engineRequire.resolve('@wildshard/engine/package.json'), 'utf8')).version;
  const key = `${engine} ${platform()}-${arch()} ${cpus()[0]?.model ?? 'cpu'}`;
  const report = { key, node: process.version, openMs: Math.round(openMs), horses: horses().length,
    nearHerd: { ticks: nearTicks, of: HERD_TICKS, meanHorses: Math.round(near.reduce((sum, count) => sum + count, 0) / HERD_TICKS * 10) / 10, maxHorses: Math.max(...near) },
    spawn: stats(spawn), walk: stats(walk), herd: stats(herd), budgetMs: { tick: Math.round(TICK_MS * 1000) / 1000, bar: BAR_MS } };
  console.log(JSON.stringify(report, null, 1));

  const baselines = existsSync(BASELINES) ? JSON.parse(readFileSync(BASELINES, 'utf8')) : {};
  const entry = { herdP95: report.herd.p95, spawnP95: report.spawn.p95, nearTicks, recorded: new Date().toISOString().slice(0, 10) };
  if (process.argv.includes('--record')) {
    baselines[key] = entry; writeFileSync(BASELINES, `${JSON.stringify(baselines, null, 1)}\n`);
    console.log(`herd-tick: recorded ${key}`);
  } else if (nearTicks < HERD_TICKS / 2) {
    console.log(`herd-tick: RED the herd was within ${NEAR} m for only ${nearTicks} of ${HERD_TICKS} ticks; the window did not measure a herd`);
    process.exitCode = 2;
  } else if (baselines[key] === undefined) {
    console.log(`herd-tick: no baseline for "${key}"; review the numbers, then record: ${JSON.stringify({ [key]: entry })}`);
    process.exitCode = 1;
  } else {
    const was = baselines[key].herdP95, ratio = report.herd.p95 / was;
    const verdict = ratio > WORSE ? 'WORSE' : 'held';
    console.log(`herd-tick: ${verdict} near-herd p95 ${report.herd.p95} ms against ${was} ms recorded ${baselines[key].recorded} (x${ratio.toFixed(2)}, limit x${WORSE}); ` +
      `over 16.67 ms ${report.herd.over16}/${HERD_TICKS}, over 10 ms ${report.herd.over10}/${HERD_TICKS}`);
    if (verdict === 'WORSE') process.exitCode = 2;
  }
} finally {
  await resident.dispose?.();
}
