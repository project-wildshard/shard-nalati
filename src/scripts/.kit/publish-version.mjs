#!/usr/bin/env node
// QA-11-23-b row 47 (J505): the version a publish uploads, never one other bytes already hold. Driftwood's publish built
// for about 20 minutes, then its commit answered `409: driftwood-isle 0.0.10 is already e04d44c461b6; raise the
// version`: 0.0.10 belonged to a refused upload, which the catalogue never shows, and the `auto` picker had chosen it
// again. The API lists every version a slug's uploads hold, refused ones too (`/api/catalogue/shards/<slug>/versions`,
// api-server `a17171c`); the picker skips them, and a chosen version another upload holds refuses at once, naming the
// next free one, unless this checkout's shard source is the one that upload was built from (the same bytes go on to
// upload's idempotent path). Until the API serves the list, it warns and goes on. Kit-owned; edit it in repo-kit, never
// in a shard repo.
//
//   node src/scripts/.kit/publish-version.mjs <slug> <repo|X.Y.Z|auto>     prints and outputs `version`
//
// publish-preflight.mjs runs the same choice before the build when it knows the slug. With PUBLISH_REHEARSE=true a
// taken version only warns: a rehearsal never uploads.
import { agentFetch as fetch } from './wildshard-agent-requests.mjs';
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const API = process.env.WILDSHARD_API_URL || 'https://api.wildshard.io';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/u;

export class Refusal extends Error {
  name = 'Refusal';
}

/** -1, 0 or 1. */
export function compareVersions(a, b) {
  const [x, y] = [SEMVER.exec(a), SEMVER.exec(b)];
  if (!x || !y) throw new Refusal(`not a version X.Y.Z: ${!x ? a : b}`);
  for (let at = 1; at <= 3; at += 1) {
    const d = Number(x[at]) - Number(y[at]);
    if (d !== 0) return Math.sign(d);
  }
  return 0;
}

/** The highest X.Y.Z of `versions`; undefined and malformed ones are skipped. */
export function highestVersion(versions) {
  return versions.filter((row) => row && SEMVER.test(row)).sort(compareVersions).at(-1);
}

/** The first patch above `from` that no upload in `taken` holds. */
export function nextFree(from, taken = []) {
  const held = new Set(taken.map((row) => row.version));
  const [, major, minor, patch] = SEMVER.exec(from) ?? [];
  if (major === undefined) throw new Refusal(`not a version X.Y.Z: ${from}`);
  let next = Number(patch) + 1;
  while (held.has(`${major}.${minor}.${next}`)) next += 1;
  return `${major}.${minor}.${next}`;
}

/** The version upload sends. `repo` (SHARD-COMPAT CP13) is package.json's own version, refused unless it rises above the
 * catalogue's; `auto` is the next patch no upload holds above the catalogue's and every taken one (`taken`: the API's
 * versions for the slug), or package.json's when higher and free; X.Y.Z must rise above the catalogue's. */
export function nextVersion(wanted, catalogued, own, taken = []) {
  if (wanted === 'repo') {
    if (!own || !SEMVER.test(own) || own === '0.0.0') throw new Refusal(`package.json declares no shard version X.Y.Z (${own ?? 'none'}): set "version" in the repo (CP13)`);
    if (catalogued && compareVersions(own, catalogued) <= 0) throw new Refusal(`package.json version ${own} is not above the catalogue's ${catalogued}: bump "version" in the repo and push (CP13)`);
    return own;
  }
  if (wanted !== 'auto') {
    if (catalogued && compareVersions(wanted, catalogued) <= 0) throw new Refusal(`version ${wanted} is not above the catalogue's ${catalogued}`);
    compareVersions(wanted, wanted);
    return wanted;
  }
  if (catalogued && !SEMVER.test(catalogued)) throw new Refusal(`the catalogue's version is not X.Y.Z: ${catalogued}`);
  const held = new Set(taken.map((row) => row.version));
  const free = (version) => Boolean(version) && SEMVER.test(version) && version !== '0.0.0' && !held.has(version);
  const top = highestVersion([catalogued, ...held]);
  if (!top) return free(own) ? own : nextFree('0.0.0', taken);
  const bumped = nextFree(top, taken);
  return free(own) && compareVersions(own, bumped) > 0 ? own : bumped;
}

/**
 * A refusal line when another upload holds `version` with other bytes; `{warn}` when it can't tell whether this source
 * built them; undefined when the version is free or this checkout's shard source is the one that upload was built from.
 * `same(commit)`: true, false, or undefined when unknown.
 */
export function takenProblem(slug, version, taken, same) {
  const row = taken.find((held) => held.version === version);
  if (!row) return undefined;
  const verdict = same(row.commit);
  if (verdict === true) return undefined;
  const next = nextFree(highestVersion(taken.map((held) => held.version)) ?? version, taken);
  const line = `${slug} ${version} is already ${String(row.hash).slice(0, 12)} (other bytes): raise the version to ${next}`;
  return verdict === false ? line : { warn: `${line}, unless this source builds the same bytes (its commit ${row.commit ?? 'unknown'} is not readable here)` };
}

/** Paths a shard file's bytes don't depend on. */
const NOT_BYTES = ['test', 'docs', 'project', '.github', 'published.json', '*.md'].map((path) => `:(exclude)${path}`);

/** Whether `commit`'s shard source is HEAD's: true, false, or undefined when it can't tell. A candidate SDK or engine
 * builds other bytes. `git` runs one git command and throws on a non-zero exit (with its `status`). */
export function sameSource(commit, git = (args) => execFileSync('git', args, { stdio: 'pipe' }), env = process.env) {
  if (env.CANDIDATE_SHARDDEV || env.CANDIDATE_ENGINE) return false;
  if (!/^[0-9a-f]{40}$/u.test(commit ?? '')) return undefined;
  try {
    git(['cat-file', '-e', `${commit}^{commit}`]);
  } catch {
    try {
      git(['fetch', '-q', '--depth=1', 'origin', commit]);
    } catch {
      return undefined;
    }
  }
  try {
    git(['diff', '--quiet', commit, 'HEAD', '--', '.', ...NOT_BYTES]);
    return true;
  } catch (error) {
    return error?.status === 1 ? false : undefined;
  }
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${url.replace(/\?.*$/u, '')}: HTTP ${response.status}`);
  return response.json();
}

/** Every version the API's uploads for `slug` hold; empty, with a warning, when it can't say. */
export async function takenVersions(slug, read = getJson) {
  try {
    const body = await read(`${API}/api/catalogue/shards/${encodeURIComponent(slug)}/versions`);
    return Array.isArray(body?.versions) ? body.versions : [];
  } catch (error) {
    console.log(`::warning::the API lists no taken versions for ${slug} (${error.message}); a taken version shows at upload`);
    return [];
  }
}

/** The publish's version, or a Refusal naming the next free one. */
export async function chooseVersion(slug, wanted, { rehearse = false, read = getJson, same = sameSource, own } = {}) {
  const catalogue = await read(`${API}/api/catalogue`);
  const row = catalogue.shards?.find((shard) => shard.slug === slug);
  const version = own ?? JSON.parse(readFileSync('package.json', 'utf8')).version;
  const taken = await takenVersions(slug, read);
  const chosen = nextVersion(wanted, row?.version ?? undefined, version, taken);
  const problem = takenProblem(slug, chosen, taken, same);
  if (typeof problem === 'string' && !rehearse) throw new Refusal(problem);
  if (problem) console.log(`::warning::${typeof problem === 'string' ? problem : problem.warn}`);
  return chosen;
}

async function main([slug, wanted]) {
  if (!slug || !wanted) throw new Refusal('usage: publish-version.mjs <slug> <repo|X.Y.Z|auto>');
  const version = await chooseVersion(slug, wanted, { rehearse: process.env.PUBLISH_REHEARSE === 'true' });
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
  console.log(`version=${version}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.log(`::error::${error instanceof Refusal ? error.message : error.stack}`);
    process.exit(1);
  });
}
