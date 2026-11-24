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
//   node scripts/publish-shard.mjs preparation       refuse an empty or malformed
//                                                    PREPARATION before anything runs
//   node scripts/publish-shard.mjs summary <slug> <channel> <upload log> [shard file]
//                                                    the run's summary; the upload id
//                                                    of an accepted, cooking upload
//   node scripts/publish-shard.mjs cook <slug> <channel> <hash> [upload id]
//                                                    wait for the cook's verdict and
//                                                    staging's revision (the cook job)
//
// gate reads GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_REF and GH_TOKEN; with
// PUBLISH_REHEARSE=true on a ref other than main it reports and goes on (a
// rehearsal never uploads). Every refusal is one `::error::` line and exit 1.
import { agentFetch as fetch } from './wildshard-agent-requests.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const API = process.env.WILDSHARD_API_URL || 'https://api.wildshard.io';
const GITHUB = process.env.GITHUB_API_URL || 'https://api.github.com';
const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/u;
const PREPARATION = /^(?:v\d+\.\d+\.\d+|server-staging-[0-9a-f]{40})$/u;

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
  for (const name of ['@wildshard/sdk', '@wildshard/sdk']) {
    const spec = deps[name];
    if (typeof spec !== 'string') continue;
    const version = /^(?:npm:@wildshard\/sdk@)?(\d+\.\d+\.\d+)$/u.exec(spec)?.[1];
    if (version && compareVersions(version, SDK_FLOOR) < 0) {
      return `${name} is ${version}: its wildshard prepare times out with no --base; pin @wildshard/sdk ${SDK_FLOOR} or newer, pnpm install, commit, push`;
    }
  }
  return undefined;
}

/**
 * A6 (build-max 2026-11-20): why a `preparation` input cannot prepare. Empty fell back to the sdk's pinned engine
 * client (v0.1.54 stalled phone WebKit 240 s on both runners), and a default here goes stale as v0.1.46 and v0.1.47
 * did, so the dispatch names the client, and an empty one stops in seconds rather than after the build.
 */
export function preparationProblem(tag, newest) {
  const value = (tag ?? '').trim();
  if (!value) {
    const example = newest ?? 'vX.Y.Z';
    return `preparation is empty: name the engine release whose preparation client prepares this shard, e.g. gh workflow run publish.yml -f preparation=${example}${newest ? ` (${newest} is engine's newest release)` : ''}, or server-staging-<sha> for the build staging runs`;
  }
  return PREPARATION.test(value) ? undefined : `preparation must be vX.Y.Z or server-staging-<sha> (40 hex), not ${value}`;
}

/**
 * A6: one look at a cooking upload. `status` is the API's upload state (undefined when the upload was live at commit
 * and left no id), `row` the staging catalogue's row for the slug (what engine's pin-shard.ts checks).
 */
export function cookStep({ status, row, hash, uploadId }) {
  if (status === 'refused') {
    return { refuse: `upload ${uploadId} refused; read the verdict with: pnpm exec wildshard upload status ${uploadId}` };
  }
  // MW13: `stalled` is the API's 30-minute alarm that no cook build has started, not a verdict: the cook still takes
  // stalled uploads (api-server cook-uploads `pending`), and Sky Reach's e5c0c380 went live after it. Wait on to the
  // job's own deadline (PUBLISH_COOK_MINUTES) instead of ending red while the cook works through its queue.
  if (status === 'stalled') return { wait: 'upload stalled (no cook build in 30 min; the cook still takes it)' };
  if (status !== undefined && status !== 'live') return { wait: `upload ${status}` };
  if (row?.hash === hash && Number.isSafeInteger(row.revision)) return { revision: row.revision };
  return { wait: `staging names ${row ? `${row.slug} rev ${row.revision} ${String(row.hash).slice(0, 8)}` : 'no row for it'}, not ${hash.slice(0, 8)}` };
}

/**
 * QA-11-23-b row 48 (J505): the cook wait's end with no verdict. Driftwood's run 45384751206 ended red on a stalled
 * upload and Pine's cook (45 to 52 minutes) once outran its job, leaving a pin by hand. With `handoff` (the publish's
 * cook job, and publish-cook.yml below its last hop) the wait is not a failure: the job ends green, names the hand-off,
 * and dispatches publish-cook.yml, which waits on and asks engine for the pin once the verdict lands. Without it (the
 * last hop) it refuses, naming the command that reads the verdict.
 */
export function cookDeadline({ slug, took, wait, uploadId, handoff }) {
  const line = `no verdict after ${took} min (${wait})`;
  if (!handoff) return { refuse: `${line}; read it later with: pnpm exec wildshard upload status ${uploadId ?? '<id>'}` };
  return { summary: `### ${slug}: ${line}\n\nThe cook still runs: publish-cook.yml waits on for its verdict and asks engine for the pin when it lands.` };
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

/** The upload's committed line and grid lines, from its output; or the queued line of an accepted, cooking upload. */
export function uploadLines(log) {
  const lines = log.split('\n').map((line) => line.trim());
  const at = lines.findIndex((line) => /^(committed|already stored): /u.test(line));
  if (at < 0) {
    const queued = lines.find((line) => /^queued: /u.test(line));
    const id = queued && /\(upload (\S+)\)$/u.exec(queued)?.[1];
    return { committed: undefined, after: [], ...(queued ? { queued, uploadId: id } : {}) };
  }
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

function report(slug, channel, logFile, shardFile) {
  const parsed = uploadLines(readFileSync(logFile, 'utf8'));
  const hash = parsed.hash ?? (shardFile ? createHash('sha256').update(readFileSync(shardFile)).digest('hex') : undefined);
  if (parsed.queued && parsed.uploadId && hash) {
    // A6: the API accepted the upload and the cook runs on (Pine's take 45 to 52 minutes); this job ends green here and
    // the cook job reports the verdict.
    summary(`### ${slug} on ${channel}: accepted, cooking\n\n~~~text\n${parsed.queued}\n~~~\n\nThe cook job waits for the verdict; by hand: \`pnpm exec wildshard upload status ${parsed.uploadId}\``);
    output('upload_id', parsed.uploadId);
    output('hash', hash);
    return;
  }
  if (!parsed.committed) throw new Refusal('the upload printed no committed or queued line');
  summary(`### ${slug} on ${channel}\n\n~~~text\n${[parsed.committed, ...parsed.after].join('\n')}\n~~~`);
  if (parsed.revision !== undefined) {
    output('revision', String(parsed.revision));
    output('hash', parsed.hash);
  }
}

async function preparation() {
  const tag = process.env.PREPARATION ?? '';
  let newest;
  if (!tag.trim()) {
    try {
      newest = (await getJson(`${GITHUB}/repos/project-wildshard/engine/releases/latest`, process.env.GH_TOKEN)).tag_name;
    } catch {
      newest = undefined;
    }
  }
  const problem = preparationProblem(tag, newest);
  if (problem) throw new Refusal(problem);
  summary(`preparation: ${tag.trim()}`);
}

const minutes = (name, fallback) => Number(process.env[name] ?? fallback) * 60_000;

async function cook(slug, channel, hash, uploadId) {
  const started = Date.now();
  const deadline = started + minutes('PUBLISH_COOK_MINUTES', 100);
  const pause = minutes('PUBLISH_COOK_POLL_MINUTES', 1);
  let seen;
  for (;;) {
    let step;
    try {
      const status = uploadId ? (await getJson(`${API}/api/shardfiles/uploads/${encodeURIComponent(uploadId)}/status`)).status : undefined;
      const document = status === undefined || status === 'live' ? await getJson(`${API}/api/catalogue.json?channel=staging`) : undefined;
      step = cookStep({ status, row: document?.shards?.find((row) => row.slug === slug), hash, uploadId });
    } catch (error) {
      step = { wait: `the API: ${error.message}` };
    }
    if (step.refuse) throw new Refusal(step.refuse);
    const took = Math.round((Date.now() - started) / 60_000);
    if (step.revision !== undefined) {
      output('revision', String(step.revision));
      summary(`### ${slug} cooked: rev ${step.revision} live on ${channel} (${hash.slice(0, 8)}), after ${took} min\n\nEngine pin bump (SHARD-PUBLISH-ACTIONS SP6), from any machine with gh:\n\n~~~sh\ngh workflow run shard-pin.yml -R project-wildshard/engine -f slug=${slug} -f revision=${step.revision} -f hash=${hash} -f channel=${channel}\n~~~`);
      return;
    }
    if (step.wait !== seen) console.log(`cook: ${step.wait} (${took} min)`);
    seen = step.wait;
    if (Date.now() + pause > deadline) {
      const end = cookDeadline({ slug, took, wait: step.wait, uploadId, handoff: process.env.PUBLISH_COOK_HANDOFF === 'true' });
      if (end.refuse) throw new Refusal(end.refuse);
      output('handoff', 'true');
      summary(end.summary);
      return;
    }
    await sleep(pause);
  }
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'gate') return gate();
  if (command === 'build') return build(rest[0] || undefined);
  if (command === 'version' && rest.length === 2) return version(rest[0], rest[1]);
  if (command === 'preparation') return preparation();
  if (command === 'summary' && (rest.length === 3 || rest.length === 4)) return report(...rest);
  if (command === 'cook' && (rest.length === 3 || rest.length === 4)) return cook(rest[0], rest[1], rest[2], rest[3] || undefined);
  throw new Refusal('usage: publish-shard.mjs gate | preparation | build [slug] | version <slug> <X.Y.Z|auto> | summary <slug> <channel> <log> [shard file] | cook <slug> <channel> <hash> [upload id]');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.log(`::error::${error instanceof Refusal ? error.message : error.stack}`);
    process.exit(1);
  });
}
