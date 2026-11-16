#!/usr/bin/env node
// SHARD-PUBLISH-ACTIONS (meta J369, J371): the steps publish.yml runs that
// need more than one shell line. Node built-ins only: `gate` runs before
// `pnpm install`. Kit-owned; edit it in repo-kit, never in a shard repo.
//
//   node scripts/publish-shard.mjs gate              refuse a dispatch that is not
//                                                    main's tip, or whose main is red
//   node scripts/publish-shard.mjs build [slug]      build, then name the product folder
//   node scripts/publish-shard.mjs version <slug> <X.Y.Z|auto>
//                                                    the version upload sends
//   node scripts/publish-shard.mjs summary <slug> <channel> <upload log>
//                                                    the run's summary and pin line
//
// gate reads GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_REF and GH_TOKEN; with
// PUBLISH_REHEARSE=true on a ref other than main it reports and goes on (a
// rehearsal never uploads). Every refusal is one `::error::` line and exit 1.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const API = process.env.WILDSHARD_API_URL || 'https://api.wildshard.io';
const GITHUB = process.env.GITHUB_API_URL || 'https://api.github.com';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/u;

class Refusal extends Error {}

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

/** The version upload sends: `auto` is the catalogue's patch + 1, or package.json's when higher. */
export function nextVersion(wanted, catalogued, own) {
  if (wanted !== 'auto') {
    if (catalogued && compareVersions(wanted, catalogued) <= 0) throw new Refusal(`version ${wanted} is not above the catalogue's ${catalogued}`);
    compareVersions(wanted, wanted);
    return wanted;
  }
  if (!catalogued) return own && SEMVER.test(own) && own !== '0.0.0' ? own : '0.0.1';
  const [, major, minor, patch] = SEMVER.exec(catalogued) ?? [];
  if (major === undefined) throw new Refusal(`the catalogue's version is not X.Y.Z: ${catalogued}`);
  const bumped = `${major}.${minor}.${Number(patch) + 1}`;
  return own && SEMVER.test(own) && compareVersions(own, bumped) > 0 ? own : bumped;
}

/**
 * The gate's verdict: what refuses, and what only warns. `ci` is the exact
 * SHA's `ci` push runs, newest first; `ring2` the newest finished run of each
 * ring-2 workflow on main.
 */
export function gateVerdict({ ref, sha, mainSha, ci, ring2, rehearse }) {
  const problems = [];
  if (ref !== 'refs/heads/main') problems.push(`dispatched on ${ref}: publish ships main only`);
  else if (mainSha !== sha) problems.push(`main moved to ${mainSha.slice(0, 10)} after this run started at ${sha.slice(0, 10)}: dispatch again`);
  const run = ci.find((row) => row.status === 'completed' && row.conclusion !== 'cancelled') ?? ci[0];
  if (!run) problems.push(`no ci push run for ${sha.slice(0, 10)}: main must be green before it ships`);
  else if (run.status !== 'completed') problems.push(`ci for ${sha.slice(0, 10)} is still ${run.status}: dispatch again when it is green (${run.html_url})`);
  else if (run.conclusion !== 'success') problems.push(`main is red: ci ${run.conclusion} for ${sha.slice(0, 10)} (${run.html_url})`);
  for (const row of ring2) {
    if (row.conclusion !== 'success') problems.push(`main is red: ${row.name} ${row.conclusion} at ${row.head_sha.slice(0, 10)} (${row.html_url})`);
  }
  const relaxed = rehearse && ref !== 'refs/heads/main';
  return { refuse: relaxed ? [] : problems, warn: relaxed ? problems : [] };
}

/** The oldest sdk whose `wildshard prepare` finishes with no `--base` (0.2.11 and 0.2.12 time out at 240 s). */
export const SDK_FLOOR = '0.2.13';

/** A refusal when package.json pins an exact sdk below SDK_FLOOR; a range or a missing pin passes. */
export function sdkPinProblem(pkg) {
  const deps = { ...pkg.devDependencies, ...pkg.dependencies };
  for (const name of ['@wildshard/sharddev', '@wildshard/sdk']) {
    const spec = deps[name];
    if (typeof spec !== 'string') continue;
    const version = /^(?:npm:@wildshard\/sdk@)?(\d+\.\d+\.\d+)$/u.exec(spec)?.[1];
    if (version && compareVersions(version, SDK_FLOOR) < 0) {
      return `${name} is ${version}: its wildshard prepare times out with no --base; pin @wildshard/sdk ${SDK_FLOOR} or newer, pnpm install, commit, push`;
    }
  }
  return undefined;
}

/** The product a dispatch names: the given slug, else the only one built. */
export function pickProduct(slugs, wanted) {
  if (wanted) {
    if (!slugs.includes(wanted)) throw new Refusal(`this repo builds no ${wanted}; it builds: ${slugs.join(', ') || 'nothing'}`);
    return wanted;
  }
  if (slugs.length !== 1) throw new Refusal(`name a slug: this repo builds ${slugs.length} (${slugs.join(', ')})`);
  return slugs[0];
}

/** The upload's committed line and grid lines, from its output. */
export function uploadLines(log) {
  const lines = log.split('\n').map((line) => line.trim());
  const at = lines.findIndex((line) => /^(committed|already stored): /u.test(line));
  if (at < 0) return { committed: undefined, after: [] };
  const committed = lines[at];
  const match = /^(?:committed|already stored): (\S+) (\S+) catalogue number (\d+) for (\S+) \(([0-9a-f]{64})\)/u.exec(committed);
  return {
    committed,
    after: lines.slice(at + 1).filter(Boolean),
    ...(match ? { slug: match[1], version: match[2], revision: Number(match[3]), channel: match[4], hash: match[5] } : {}),
  };
}

async function getJson(url, token) {
  const response = await fetch(url, {
    headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Refusal(`${url.replace(/\?.*$/u, '')}: HTTP ${response.status}`);
  return response.json();
}

function output(name, value) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  console.log(`${name}=${value}`);
}

function summary(text) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
  console.log(text);
}

async function gate() {
  const { GITHUB_REPOSITORY: repo, GITHUB_SHA: sha, GITHUB_REF: ref, GH_TOKEN: token } = process.env;
  if (!repo || !sha || !ref) throw new Refusal('gate needs GITHUB_REPOSITORY, GITHUB_SHA and GITHUB_REF');
  const base = `${GITHUB}/repos/${repo}`;
  const [main, runs, workflows] = await Promise.all([
    getJson(`${base}/commits/main`, token),
    getJson(`${base}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&per_page=20`, token),
    getJson(`${base}/actions/workflows?per_page=100`, token),
  ]);
  const ring2 = [];
  for (const flow of workflows.workflows.filter((row) => /\/ring-2-[^/]+\.ya?ml$/u.test(row.path))) {
    const latest = await getJson(`${base}/actions/workflows/${flow.id}/runs?branch=main&status=completed&per_page=10`, token);
    const row = latest.workflow_runs.find((run) => run.conclusion !== 'cancelled' && run.conclusion !== 'skipped');
    if (row) ring2.push({ ...row, name: flow.name });
  }
  const verdict = gateVerdict({ ref, sha, mainSha: main.sha, ci: runs.workflow_runs, ring2, rehearse: process.env.PUBLISH_REHEARSE === 'true' });
  for (const line of verdict.warn) console.log(`::warning::rehearsal, not a refusal: ${line}`);
  const sdk = sdkPinProblem(JSON.parse(readFileSync('package.json', 'utf8')));
  if (verdict.refuse.length || sdk) throw new Refusal([...verdict.refuse, ...(sdk ? [sdk] : [])].join('; '));
  summary(`gate: ${sha.slice(0, 10)} is ${ref.replace('refs/heads/', '')}'s tip, its ci is green, ${ring2.length} ring-2 workflow(s) green on main`);
}

/** Build the way this repo builds: `build:shards` into out/, else `wildshard build .` into public/shardfiles/. */
function build(wanted) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
  let root;
  if (pkg.scripts?.['build:shards']) {
    run('pnpm', ['build:shards']);
    root = 'out';
  } else {
    run('pnpm', ['exec', 'wildshard', 'build', '.']);
    root = 'public/shardfiles';
  }
  const slugs = existsSync(root)
    ? readdirSync(root, { withFileTypes: true }).filter((row) => row.isDirectory() && existsSync(join(root, row.name, 'shard.json'))).map((row) => row.name).sort()
    : [];
  const slug = pickProduct(slugs, wanted);
  output('slug', slug);
  output('product', join(root, slug));
}

async function version(slug, wanted) {
  const catalogue = await getJson(`${API}/api/catalogue`);
  const row = catalogue.shards.find((shard) => shard.slug === slug);
  const own = JSON.parse(readFileSync('package.json', 'utf8')).version;
  output('version', nextVersion(wanted, row?.version ?? undefined, own));
}

function report(slug, channel, logFile) {
  const parsed = uploadLines(readFileSync(logFile, 'utf8'));
  if (!parsed.committed) throw new Refusal('the upload printed no committed line');
  summary(`### ${slug} on ${channel}\n\n~~~text\n${[parsed.committed, ...parsed.after].join('\n')}\n~~~`);
  if (parsed.revision !== undefined) {
    output('revision', String(parsed.revision));
    output('hash', parsed.hash);
    summary(`\nEngine pin bump (SHARD-PUBLISH-ACTIONS SP6), from any machine with gh:\n\n~~~sh\ngh workflow run shard-pin.yml -R project-wildshard/engine -f slug=${slug} -f revision=${parsed.revision} -f hash=${parsed.hash} -f channel=${channel}\n~~~`);
  }
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'gate') return gate();
  if (command === 'build') return build(rest[0] || undefined);
  if (command === 'version' && rest.length === 2) return version(rest[0], rest[1]);
  if (command === 'summary' && rest.length === 3) return report(rest[0], rest[1], rest[2]);
  throw new Refusal('usage: publish-shard.mjs gate | build [slug] | version <slug> <X.Y.Z|auto> | summary <slug> <channel> <log>');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.log(`::error::${error instanceof Refusal ? error.message : error.stack}`);
    process.exit(1);
  });
}
