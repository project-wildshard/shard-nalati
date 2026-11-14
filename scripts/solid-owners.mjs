#!/usr/bin/env node
// solid-owners.mjs: give every server solid in Nalati's bake its owner and material (meta SERVER-PARITY SS10b).
//
// The room's world solids are rows in src/data/physicsRows.json: a frozen capture of the page's colliders, in the order
// the page made them, which carried no owner or material, so an arrow, a footstep or a hit on the room read "nothing"
// where the page reads "the corral, wood". The same capture kept the page's piece registry (`pieces`: id, surface and
// collider count, in registration order), and the solids follow it one piece after another. This walks that layout:
//
//   - solids 0 to 3: the chunk's outer walls, `edge` (engine `addEdgeWalls` tags the room's own the same way);
//   - `forest`'s capsules, then the grid's 4 entry boxes (`platform.grid`, stone), then every other piece in order;
//   - a piece's count is its collider descriptions: a `treads` description makes one box per tread (engine
//     `treadBoxes`), so the Kurgan entrance's 19 descriptions are 24 solids;
//   - a piece with no solids in the capture (the camp child is an actor, not world) is skipped.
//
// Each solid's `ownerId` is `piece:<piece id>`: engine's nativeBake tags the room's collider with it, a phone's server
// worker still streams it near its player (only a declared owner is built eagerly), and side parity reads it as the piece. Its material is the
// piece's surface, or, given `--page`, the material of the page collider of the same shape within 1 m (engine
// test/side-parity.page.json: the page's own per-collider surfaces, such as the bridge's planks and the dungeon's metal).
// A layout that doesn't add up, or a page collider whose owner names another piece, fails the run.
//
//   node scripts/solid-owners.mjs [--page=<side-parity.page.json>]          # write owner + material into physicsRows.json
//   node scripts/solid-owners.mjs [--page=<side-parity.page.json>] --check  # exit 1 when they drifted
//
// Then refresh physicsRows.d.json.ts as scripts/forest-trunks.mjs says.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const FILE = resolve(ROOT, 'src/data/physicsRows.json');
const flag = (name, fallback) => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
/** The bake's first four solids are the outer walls (scripts/forest-trunks.mjs). */
const WALLS = 4;
/** The grid's entry boxes the page had built when the bake was captured, right after the forest. */
const GRID = { after: 'forest', count: 4, owner: 'piece:platform.grid', material: 'stone' };
/** Pieces whose solids are not their description count, and why. */
const SOLIDS = new Map([
  ['nalati-grasslands/kurgan-entrance', { solids: 24, why: 'one treads description is 6 boxes' }],
  ['nalati-camp-child', { solids: 0, why: 'an actor the capture left out' }],
]);
const SLACK = 1;

/** q · v for a unit quaternion [x, y, z, w]. */
function rotate([x, y, z, w], [vx, vy, vz]) {
  const ix = w * vx + y * vz - z * vy, iy = w * vy + z * vx - x * vz, iz = w * vz + x * vy - y * vx, iw = -x * vx - y * vy - z * vz;
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
}

/** A bake solid's world box, rounded to whole metres the way engine side parity's `colliderInventory` rounds a collider's. */
export function solidBox(solid, points) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const add = p => { const r = rotate(solid.rot, p); for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], r[i]); hi[i] = Math.max(hi[i], r[i]); } };
  const extents = (hx, hy, hz) => { for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) add([sx * hx, sy * hy, sz * hz]); };
  if (solid.shape === 1) extents(...solid.half);
  else if (solid.shape === 2) extents(solid.radius, solid.halfHeight + solid.radius, solid.radius);
  else for (let i = 0; i + 2 < points.length; i += 3) add([points[i], points[i + 1], points[i + 2]]);
  return [0, 1, 2, 0, 1, 2].map((axis, i) => Math.round(solid.at[axis] + (i < 3 ? lo : hi)[axis]));
}

/** Each solid's { owner, material } from the piece layout. */
export function layoutNames(rows) {
  const names = Array.from({ length: WALLS }, () => ({ owner: null, material: 'edge' }));
  for (const piece of rows.pieces) {
    const count = SOLIDS.get(piece.id)?.solids ?? piece.colliders;
    for (let i = 0; i < count; i++) names.push({ owner: `piece:${piece.id}`, material: piece.surface });
    if (piece.id === GRID.after) for (let i = 0; i < GRID.count; i++) names.push({ owner: GRID.owner, material: GRID.material });
  }
  if (names.length !== rows.solids.length) throw new Error(`solid-owners: the piece layout names ${names.length} solids, the bake has ${rows.solids.length}`);
  return names;
}

/** The page owner's piece: no chunk tile (`.c61`), no placement (`.camp.16`), no bake prefix. */
const pagePiece = owner => owner.replace(/^(?:piece|string):/u, '').replace(/^([^/]+\/[^.]+)\..*$/u, '$1').replace(/\.c\d+$/u, '');
/** A registry id's piece: a second placement (`#2`) or a 150-collider part (`-2`) is the same model. */
const basePiece = id => id.replace(/^piece:/u, '').replace(/(?:#\d+)?(?:-\d+)?$/u, '');

/** Take each page collider's material for the solid of the same shape whose box agrees within SLACK, nearest first, one to one. */
export function withPageMaterials(rows, names, boxes, page) {
  const spread = (a, b) => Math.max(...a.map((value, i) => Math.abs(value - b[i])));
  const pairs = [];
  for (const [index, solid] of rows.solids.entries()) {
    if (index < WALLS) continue;
    for (const [at, row] of page.entries()) if (row.shape === solid.shape && spread(boxes[index], row.box) <= SLACK) pairs.push({ index, at, gap: spread(boxes[index], row.box) });
  }
  pairs.sort((a, b) => a.gap - b.gap || a.index - b.index || a.at - b.at);
  const taken = new Set(), used = new Set(), wrong = [];
  const out = names.slice();
  for (const { index, at } of pairs) {
    if (taken.has(index) || used.has(at)) continue;
    taken.add(index); used.add(at);
    const row = page[at], mine = basePiece(names[index].owner ?? ''), theirs = basePiece(pagePiece(row.owner));
    if (mine !== theirs) wrong.push(`#${index} ${names[index].owner}: the page's ${row.owner} stands there`);
    out[index] = { ...names[index], material: row.material };
  }
  if (wrong.length > 0) throw new Error(`solid-owners: ${wrong.length} solid(s) the layout names for another piece:\n  ${wrong.join('\n  ')}`);
  return { names: out, matched: taken.size };
}

/** A bake solid with its owner and material. The reader stays `piece` provenance (format nativePhysics): the row keeps its
 *  `body` (the arena seal is found by it) and names its piece as `ownerId`; engine 0.1.18 reads the material only. */
export function namedSolid({ ownerId: _ownerId, material: _material, ...solid }, name) {
  return { ...solid, ...(name.owner === null ? {} : { ownerId: name.owner }), material: name.material };
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === import.meta.filename) {
  const rows = JSON.parse(readFileSync(FILE, 'utf8'));
  let names = layoutNames(rows);
  const pageFile = flag('page', '');
  if (pageFile !== '') {
    const page = JSON.parse(readFileSync(resolve(pageFile), 'utf8')).shards['nalati-grasslands']
      .filter(row => !row.sensor && !row.dynamic && row.owner !== null && row.material !== null && row.material !== 'flesh' && !row.owner.startsWith('(') && row.owner !== 'platform.grid');
    const blobs = new Map();
    const points = solid => {
      if (solid.vertices === undefined) return [];
      const { file, byteOffset, byteLength } = solid.vertices;
      if (!blobs.has(file)) blobs.set(file, readFileSync(resolve(ROOT, 'src', file)));
      const bytes = blobs.get(file);
      return new Float32Array(bytes.buffer.slice(bytes.byteOffset + byteOffset, bytes.byteOffset + byteOffset + byteLength));
    };
    const result = withPageMaterials(rows, names, rows.solids.map(solid => solidBox(solid, points(solid))), page);
    names = result.names;
    console.error(`solid-owners: ${result.matched} of ${page.length} page colliders checked against the layout`);
  }
  const solids = rows.solids.map((solid, index) => namedSolid(solid, names[index]));
  console.error(`solid-owners: ${solids.length} solids, ${new Set(names.map(name => name.owner)).size} owners`);
  if (process.argv.includes('--check')) {
    const drift = solids.filter((solid, index) => solid.ownerId !== rows.solids[index].ownerId || solid.material !== rows.solids[index].material).length;
    if (drift > 0) { console.error(`solid-owners: ${drift} solid(s) drifted; run without --check`); process.exit(1); }
  } else writeFileSync(FILE, `${JSON.stringify({ ...rows, solids })}\n`);
}
