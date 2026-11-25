// FAST-RELEASE FR-A23 (meta FAST-RELEASE-PLAN; opus-cook, 11-25): a publish's `-f sharddev=<sha>` candidate.
// The repo's select-candidate.mjs pins `@wildshard/sharddev` to the commit, a package no shard depends on since
// SDK-SPLIT: the recorder, the CLI and the build ship as @wildshard/{kit,upload,sdk,build,dev,cli}, so a rehearsal
// named a candidate and ran the published SDK (Nalati 45630862947 ran @wildshard/dev 0.4.30 under candidate 2f27c66b).
// This runs after select-candidate.mjs: it packs the candidate commit the way sharddev's release does
// (`release-workspace.mjs pack`) and points every SDK package the repo installs at those archives, and the format at the
// packed SDK's own pin, as sharddev's packed-install proof moves a real shard (Nalati's 0.74.1 pin broke the 0.4.34 build).
//   CANDIDATE_SHARDDEV=<sha> node scripts/publish-candidate.mjs     (no candidate: does nothing)
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The SDK family sharddev releases at one version (SDK-SPLIT D5). */
export const SDK_PACKAGES = ['@wildshard/kit', '@wildshard/upload', '@wildshard/sdk', '@wildshard/build', '@wildshard/dev', '@wildshard/cli'];

/** `pkg` with select-candidate's stale `@wildshard/sharddev` edge dropped, every SDK package it installs, directly or
 *  through another, pointed at the candidate's archives, and every format edge and override at `format`, the packed
 *  SDK's own `@wildshard/format` pin (`npm:@wildshard/shard-format@X`; the kit names it `@wildshard/shard-format` X).
 *  Throws when the repo installs none of them.
 * @param {{dependencies?: Record<string, string>, devDependencies?: Record<string, string>, pnpm?: {overrides?: Record<string, string>}}} pkg
 * @param {readonly {name: string, archive: string, version: string}[]} artifacts
 * @param {string} format
 * @returns {{pkg: typeof pkg, swapped: string[]}} */
export function swapCandidate(pkg, artifacts, format) {
  const version = /^npm:@wildshard\/shard-format@(\S+)$/u.exec(format)?.[1];
  if (version === undefined) throw new Error(`The candidate's sdk pins the format as ${format}, not npm:@wildshard/shard-format@X`);
  const next = structuredClone(pkg), overrides = (next.pnpm ??= {}).overrides ??= {};
  for (const edges of [next.dependencies, next.devDependencies]) if (edges) delete edges['@wildshard/sharddev'];
  delete overrides['@wildshard/sharddev'];
  const byName = new Map(artifacts.map(row => [row.name, row]));
  const missing = SDK_PACKAGES.filter(name => !byName.has(name));
  if (missing.length > 0) throw new Error(`The candidate packed no ${missing.join(', ')}`);
  const swapped = [];
  for (const name of SDK_PACKAGES) {
    const spec = `file:${byName.get(name)?.archive}`;
    let direct = false;
    for (const edges of [next.dependencies, next.devDependencies]) if (edges?.[name] !== undefined) { edges[name] = spec; direct = true; }
    // The family depends on itself (dev on build, kit, sdk, upload): override all six, so none resolves from npm.
    overrides[name] = spec;
    if (direct) swapped.push(`${name} ${byName.get(name)?.version}`);
  }
  if (swapped.length === 0) throw new Error('This repo installs no SDK package, so a sharddev candidate changes nothing it runs');
  const formatFor = key => ({'@wildshard/format': format, '@wildshard/shard-format': version})[key.slice(key.lastIndexOf('>') + 1)];
  for (const edges of [next.dependencies, next.devDependencies, overrides]) {
    for (const key of Object.keys(edges ?? {})) {
      const to = formatFor(key);
      if (edges && to !== undefined) edges[key] = to;
    }
  }
  swapped.push(`format ${version}`);
  return {pkg: next, swapped};
}

async function main() {
  const sha = process.env.CANDIDATE_SHARDDEV ?? '';
  if (sha === '') return;
  if (!/^[a-f0-9]{40}$/u.test(sha)) throw new Error('sharddev: candidate must be a full commit hash');
  // The build job's git already reads private org repos (the app token's insteadOf); RUNNER_TEMP is release-workspace's
  // owned scratch on a runner, and the repo's tmp/ off one.
  const base = process.env.RUNNER_TEMP ? resolve(process.env.RUNNER_TEMP) : resolve('tmp');
  mkdirSync(base, {recursive: true});
  const work = mkdtempSync(join(base, 'sharddev-candidate-')), packs = join(base, `sharddev-packs-${sha.slice(0, 12)}`);
  const run = (command, args, cwd = work) => execFileSync(command, args, {cwd, stdio: ['ignore', 'inherit', 'inherit']});
  run('git', ['init', '--quiet']);
  run('git', ['fetch', '--quiet', '--depth=1', 'https://github.com/project-wildshard/sharddev.git', sha]);
  run('git', ['checkout', '--quiet', '--detach', 'FETCH_HEAD']);
  run('pnpm', ['install', '--frozen-lockfile', '--config.ci=false']);
  run('node', ['scripts/release-workspace.mjs', 'pack', packs]);
  const artifacts = JSON.parse(readFileSync(join(packs, 'release-artifacts.json'), 'utf8'));
  const sdk = artifacts.find(row => row.name === '@wildshard/sdk');
  if (sdk === undefined) throw new Error('The candidate packed no @wildshard/sdk');
  const packed = JSON.parse(execFileSync('tar', ['-xOf', sdk.archive, 'package/package.json'], {encoding: 'utf8'}));
  const {pkg, swapped} = swapCandidate(JSON.parse(readFileSync('package.json', 'utf8')), artifacts, packed.dependencies?.['@wildshard/format'] ?? '');
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`sharddev candidate ${sha.slice(0, 12)}: ${swapped.join(', ')} packed from the commit`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
