#!/usr/bin/env node
// SA40 (J319): build the shards twice from a clean copy of the tree and fail when the builds differ. Generators are
// arbitrary Node, so one that reads the clock or Math.random() makes a product nobody can rebuild. CI only: this is
// not part of `wildshard check`.
//
// Each run copies the tracked files (working-tree bytes) into its own scratch folder (tmp/<WS_LANE_NAME or build-twice>/build-twice/), links
// node_modules, gives the build an empty HOME and shardfile cache, and runs `pnpm run build:shards` there. Then, for every
// product in out/, it compares map.tilesHash (sections/look/map.json) and every file's sha256. tilesHash hashes the
// map's source inputs, so a nondeterministic generator shows as product files that differ; both are reported.
// Not covered: two builds on one machine minutes apart share CPU count and locale, and git calls inside the copy see this repo.
// Usage: node scripts/build-twice.mjs [--keep]   (--keep leaves the scratch folder for a look; it is removed otherwise)
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).stdout.trim() || process.cwd());
const scratch = resolve(root, 'tmp', process.env.WS_LANE_NAME || 'build-twice', 'build-twice');
const keep = process.argv.includes('--keep');

/** @param {string} dir @returns {Map<string,string>} relative path → sha256 */
function digestTree(dir, base = dir, out = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) digestTree(path, base, out);
    else if (entry.isFile()) out.set(relative(base, path), createHash('sha256').update(readFileSync(path)).digest('hex'));
  }
  return out;
}

/** @param {string} out @returns {Map<string,{tilesHash:string|null,files:Map<string,string>}>} */
function products(out) {
  const found = new Map();
  for (const entry of existsSync(out) ? readdirSync(out, { withFileTypes: true }) : []) {
    const dir = join(out, entry.name);
    if (!entry.isDirectory() || !existsSync(join(dir, 'shard.json'))) continue;
    const map = join(dir, 'sections/look/map.json');
    const tilesHash = existsSync(map) ? (JSON.parse(readFileSync(map, 'utf8')).map?.tilesHash ?? null) : null;
    found.set(entry.name, { tilesHash, files: digestTree(dir) });
  }
  return found;
}

/** @param {string} name */
function build(name) {
  const dir = join(scratch, name), tree = join(dir, 'tree');
  const listed = spawnSync('git', ['ls-files', '-z', '--cached'], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (listed.status !== 0) throw new Error(`git ls-files failed: ${listed.stderr}`);
  for (const file of listed.stdout.split('\0').filter(Boolean)) {
    const from = join(root, file), to = join(tree, file);
    const stat = lstatSync(from, { throwIfNoEntry: false });
    if (stat === undefined || stat.isDirectory()) continue; // deleted in the working tree, or a submodule
    mkdirSync(dirname(to), { recursive: true });
    if (stat.isSymbolicLink()) symlinkSync(readlinkSync(from), to);
    else cpSync(from, to);
  }
  symlinkSync(join(root, 'node_modules'), join(tree, 'node_modules'), 'dir');
  const cache = join(dir, 'cache');
  // An empty HOME per run: ~/.cache/wildshard/gen holds generation keyed by source, which would hand run b run a's
  // bytes and hide the very thing this checks. Only the pinned Basis compiler (verified by its own receipt) is shared.
  const home = join(dir, 'home'), basis = join(homedir(), '.cache/wildshard/basis');
  mkdirSync(join(home, '.cache/wildshard'), { recursive: true });
  mkdirSync(basis, { recursive: true });
  symlinkSync(basis, join(home, '.cache/wildshard/basis'), 'dir');
  // Run b also sits in another time zone, so a generator that reads the local date shows too.
  const env = { ...process.env, HOME: home, XDG_CACHE_HOME: join(home, '.cache'), TZ: name === 'a' ? 'UTC' : 'Pacific/Kiritimati',
    WILDSHARD_SHARDFILE_CACHE: cache, WILDSHARD_WORLD_TEXTURE_CACHE: join(cache, '.world-textures-v1'), WS_SHARD_PARSE_CACHE: join(cache, 'shard-parse') };
  console.info(`build-twice: build ${name} in ${relative(root, tree)}`);
  const run = spawnSync('pnpm', ['run', 'build:shards'], { cwd: tree, env, stdio: 'inherit' });
  if (run.status !== 0) throw new Error(`build ${name} failed (exit ${run.status ?? run.signal})`);
  return products(join(tree, 'out'));
}

let failed = false;
try {
  rmSync(scratch, { recursive: true, force: true });
  const a = build('a'), b = build('b');
  if (a.size === 0) throw new Error('no products in out/: nothing was built');
  for (const slug of new Set([...a.keys(), ...b.keys()])) {
    const one = a.get(slug), two = b.get(slug);
    if (one === undefined || two === undefined) { failed = true; console.error(`build-twice: ${slug} built only in run ${one ? 'a' : 'b'}`); continue; }
    if (one.tilesHash !== two.tilesHash) { failed = true; console.error(`build-twice: ${slug} tilesHash differs: ${one.tilesHash} vs ${two.tilesHash}`); }
    const diff = [];
    for (const path of new Set([...one.files.keys(), ...two.files.keys()])) {
      const x = one.files.get(path), y = two.files.get(path);
      if (x !== y) diff.push(x === undefined ? `only in b: ${path}` : y === undefined ? `only in a: ${path}` : `differs: ${path}`);
    }
    if (diff.length > 0) {
      failed = true;
      console.error(`build-twice: ${slug} is not reproducible, ${diff.length} file(s) differ between two builds of the same tree:`);
      for (const line of diff.sort().slice(0, 30)) console.error(`  ${line}`);
      if (diff.length > 30) console.error(`  … and ${diff.length - 30} more`);
    } else console.info(`build-twice: ${slug} reproducible (tilesHash ${one.tilesHash ?? 'none'}, ${one.files.size} files identical)`);
  }
  if (failed) console.error('build-twice: a generator gave different bytes for the same source (a clock, Math.random(), unordered iteration?). Make it deterministic.');
} catch (error) {
  failed = true;
  console.error(`build-twice: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  if (!keep) rmSync(scratch, { recursive: true, force: true });
}
process.exitCode = failed ? 1 : 0;
