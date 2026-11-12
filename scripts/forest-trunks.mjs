#!/usr/bin/env node
// forest-trunks.mjs: re-capture Nalati's spruce trunks into the server bake (meta SERVER-PARITY SS10b).
//
// The room's tree colliders are rows in src/shards/nalati-grasslands/data/physicsRows.json: one capsule solid per tree,
// right after the four outer walls, counted by `pieces[0]` (`forest`). The page plants its forest
// at boot (engine `placeForest` over the product's forest rows, `Forest.colliderDescs` builds the capsules). When the
// page's planting moves, the frozen rows drift and room players walk through the page's trees. This reads the page's
// own trees from a served engine build (headless Chromium, `?chunk=nalati-grasslands`) and rewrites those rows so the
// room's capsules are the page's, one for one (engine `trunkCapsule`, f32 like every other solid row).
//
// `trees` and `tops` stay as they are: they are the population habitat (herds, weather shelter), and the format pins
// that file at exactly 155 rows (shardfile src/format/populationEnvironment.ts, G1004), so moving them is a format row.
//
//   node scripts/forest-trunks.mjs --url=http://127.0.0.1:4177          # write physicsRows.json
//   node scripts/forest-trunks.mjs --url=http://127.0.0.1:4177 --check  # exit 1 when the rows drifted
//
// Serve an engine build that pins this shard's current product (engine: `pnpm build:game`, then
// `node scripts/preview-server.mjs --root . --port 4177`). Then refresh physicsRows.d.json.ts: run engine's
// scripts/json-declarations.mjs from here by its real path (`node "$(realpath node_modules/@wildshard/engine/scripts/json-declarations.mjs)"`).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { KEYCHAIN_ARGS } from './chromium-keychain.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FILE = resolve(ROOT, 'src/shards/nalati-grasslands/data/physicsRows.json');
/** The bake's first four solids are the outer walls; the forest's capsules follow them (`pieces[0]` is `forest`). */
const FIRST_TRUNK = 4;
const CAPSULE = 2;

const flag = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

/** engine src/client/engine/world/forest/Forest.ts `trunkCapsule`: centre above the foot, half straight length, radius.
 *  A copy, not an import (this script runs outside the engine's TS loader). What guards both this copy and drift in the
 *  page's planting is engine's test/side-parity.test.ts on the pinned product: a page trunk with no server capsule is a
 *  `forest (wood)` finding there, and CI fails until this script is run again and the product re-pinned. */
export function trunkCapsule(tree) {
  const h = Math.max(1, tree.height);
  return { y: h / 2, halfHeight: Math.max(0.05, h / 2 - tree.r), radius: tree.r };
}

/** The bake rows for these page trees, spliced into `rows` in place of its old forest rows. */
export function withTrees(rows, trees) {
  const forest = rows.pieces[0];
  if (forest?.id !== 'forest') throw new Error('physicsRows: pieces[0] is not the forest');
  const old = rows.solids.slice(FIRST_TRUNK, FIRST_TRUNK + forest.colliders);
  if (forest.colliders === 0 || old.length !== forest.colliders || old.some(s => s.shape !== CAPSULE)) {
    throw new Error('physicsRows: the forest capsules are not where pieces[0] says');
  }
  const f = Math.fround;
  const solids = trees.map(t => {
    const c = trunkCapsule(t);
    return { shape: CAPSULE, groups: old[0].groups, friction: old[0].friction, body: null, at: [f(t.x), f(t.y + c.y), f(t.z)], rot: [0, 0, 0, 1], halfHeight: f(c.halfHeight), radius: f(c.radius) };
  });
  return {
    ...rows,
    pieces: [{ ...forest, colliders: trees.length }, ...rows.pieces.slice(1)],
    solids: [...rows.solids.slice(0, FIRST_TRUNK), ...solids, ...rows.solids.slice(FIRST_TRUNK + forest.colliders)],
  };
}

async function capture(base, timeout) {
  const browser = await chromium.launch({ headless: true, args: [...KEYCHAIN_ARGS, '--use-angle=metal', '--ignore-gpu-blocklist', '--mute-audio'] });
  try {
    const context = await browser.newContext({ ...devices['iPhone 16 Pro'] }), page = await context.newPage();
    await page.goto(`${base}/?chunk=nalati-grasslands&tier=phone&skipintro=1&nolock=1&sw=0&mute=1`, { waitUntil: 'commit', timeout });
    await page.waitForFunction(() => {
      const failure = document.querySelector('.ws-load-error');
      if (failure !== null) throw new Error(failure.textContent);
      return document.querySelector('.ws-load') === null && (window.__wildshard?.world?.forest?.trees?.length ?? 0) > 0;
    }, undefined, { timeout, polling: 250 });
    return await page.evaluate(() => window.__wildshard.world.forest.trees.map(t => ({ x: t.x, y: t.y, z: t.z, r: t.r, height: t.height })));
  } finally { await browser.close(); }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = flag('url', '');
  if (base === '') { console.error('usage: node scripts/forest-trunks.mjs --url=<served engine build> [--check]'); process.exit(2); }
  const trees = await capture(base, Number(flag('timeout', '240')) * 1000);
  const rows = JSON.parse(readFileSync(FILE, 'utf8')), next = withTrees(rows, trees);
  const same = JSON.stringify(next) === JSON.stringify(rows);
  console.error(`forest-trunks: page ${trees.length} trees, bake ${rows.pieces[0].colliders}${same ? ', same' : ', drifted'}`);
  if (process.argv.includes('--check')) process.exit(same ? 0 : 1);
  if (!same) {
    writeFileSync(FILE, `${JSON.stringify(next)}\n`);
    console.error('forest-trunks: wrote physicsRows.json; refresh physicsRows.d.json.ts (see the header)');
  }
}
