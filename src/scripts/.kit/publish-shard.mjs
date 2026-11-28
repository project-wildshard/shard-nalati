#!/usr/bin/env node
// SHARD-PUBLISH-ACTIONS (meta J369, J371): the steps publish.yml runs that
// need more than one shell line. Node built-ins only: `gate` runs before
// `pnpm install`. Kit-owned; edit it in repo-kit, never in a shard repo.
//
//   node src/scripts/.kit/publish-shard.mjs gate              refuse a dispatch that is not
//                                                    main's tip, or whose main is red
//   node src/scripts/.kit/publish-shard.mjs build [slug]      build, then name the product folder
//   node src/scripts/.kit/publish-shard.mjs version <slug> <repo|X.Y.Z|auto>
//                                                    the version upload sends
//   node src/scripts/.kit/publish-shard.mjs preparation       refuse an empty or malformed
//                                                    PREPARATION before anything runs
//   node src/scripts/.kit/publish-shard.mjs summary <slug> <channel> <upload log> [shard file]
//                                                    the run's summary; the upload id
//                                                    of an accepted, cooking upload
//   node src/scripts/.kit/publish-shard.mjs cook <slug> <channel> <hash> [upload id]
//                                                    wait for the cook's verdict and
//                                                    staging's revision (the cook job)
//
// gate reads GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_REF and GH_TOKEN; with
// PUBLISH_REHEARSE=true on a ref other than main it reports and goes on (a
// rehearsal never uploads). Every refusal is one `::error::` line and exit 1.
import { agentFetch as fetch } from './wildshard-agent-requests.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { chooseVersion, compareVersions, Refusal as VersionRefusal } from './publish-version.mjs';

const API = process.env.WILDSHARD_API_URL || 'https://api.wildshard.io';
const GITHUB = process.env.GITHUB_API_URL || 'https://api.github.com';
const PREPARATION = /^(?:v\d+\.\d+\.\d+|server-staging-[0-9a-f]{40})$/u;

class Refusal extends Error {}

// QA-11-23-b row 47: the version choice lives in publish-version.mjs (shard repos run it as its own step).
export { compareVersions, nextVersion } from './publish-version.mjs';

/**
 * The gate's verdict: what refuses, and what only warns. `ci` is the exact
 * SHA's `ci` push runs, newest first; `ring2` the newest finished run of each
 * ring-2 workflow on main.
 */
export function gateVerdict({ ref, sha, mainSha, ci, ring2, rehearse, moved, appearing = false }) {
  const problems = [];
  // FAST-RELEASE FR-A3 (J505): 17 of 25 gate refusals were "ci ... is still queued: dispatch again when it is green",
  // each a second dispatch by hand. A queued or running ci for this exact SHA is something to wait on, not a refusal;
  // gate() polls until it ends (the repo's own ci budget, QA 11-26 row 64) and still refuses a red ci or a main that
  // moves meanwhile.
  const wait = [];
  if (ref !== 'refs/heads/main') problems.push(`dispatched on ${ref}: publish ships main only`);
  // QA 11-26 row 56: in a repo publishing several slugs, every finished publish commits published.json to main, and
  // each queued dispatch behind it refused. Main ahead of this SHA by publish bookkeeping only (`moved`, from
  // bookkeepingOnly) builds the same bytes, so it ships; any other change still refuses.
  else if (mainSha !== sha && moved?.bookkeeping !== true) {
    const what = moved?.files?.length ? ` (${moved.files.slice(0, 3).join(', ')}${moved.files.length > 3 ? ', …' : ''})` : '';
    problems.push(`main moved to ${mainSha.slice(0, 10)} after this run started at ${sha.slice(0, 10)}${what}: dispatch again`);
  }
  const run = ci.find((row) => row.status === 'completed' && row.conclusion !== 'cancelled') ?? ci[0];
  // Row 64: a dispatch right after its push can start before GitHub lists that push's ci run.
  if (!run && appearing) wait.push(`no ci push run for ${sha.slice(0, 10)} yet`);
  else if (!run) problems.push(`no ci push run for ${sha.slice(0, 10)}: main must be green before it ships`);
  else if (run.status !== 'completed') wait.push(`ci for ${sha.slice(0, 10)} is still ${run.status} (${run.html_url})`);
  else if (run.conclusion !== 'success') problems.push(`main is red: ci ${run.conclusion} for ${sha.slice(0, 10)} (${run.html_url})`);
  for (const row of ring2) {
    if (row.conclusion !== 'success') problems.push(`main is red: ${row.name} ${row.conclusion} at ${row.head_sha.slice(0, 10)} (${row.html_url})`);
  }
  const relaxed = rehearse && ref !== 'refs/heads/main';
  if (relaxed) return { refuse: [], warn: [...problems, ...wait], wait: [] };
  return { refuse: problems, warn: [], wait: problems.length ? [] : wait };
}

/** The files publish's record jobs (publish.yml, publish-cook.yml) commit to main, and nothing a build reads. */
export const BOOKKEEPING = Object.freeze(['published.json']);

/**
 * QA 11-26 row 56: GitHub's compare of this run's SHA to main's tip (`compare/<sha>...<main>`). Bookkeeping when main
 * only adds commits (`ahead`) and every file they change is publish bookkeeping; anything else (a diverged main, a
 * source change, a truncated file list) is not.
 */
export function bookkeepingOnly(compare) {
  const files = (compare?.files ?? []).map((row) => String(row.filename));
  const listed = Array.isArray(compare?.files) && files.length < 300;
  return { bookkeeping: compare?.status === 'ahead' && listed && files.every((file) => BOOKKEEPING.includes(file)), files };
}

/** GitHub's job limit when a job names none. */
const JOB_DEFAULT_MINUTES = 360;

/**
 * QA 11-26 row 64: the longest a ci run of this repo may take, from its own ci.yml: each job's timeout-minutes (the
 * larger number of an expression such as `dispatch && 40 || 15`), chained through `needs:`. Nalati's publish hit the
 * old flat 30-minute wait while its exact ci (CI21 45 minutes, Ring 2 55) was still running. Undefined when the file
 * names no jobs.
 */
export function ciBudgetMinutes(yaml) {
  const jobs = new Map();
  let inJobs = false, job;
  for (const line of yaml.split('\n')) {
    if (/^\S/u.test(line)) { inJobs = /^jobs:\s*(?:#.*)?$/u.test(line); job = undefined; continue; }
    if (!inJobs) continue;
    const name = /^ {2}([\w-]+):\s*(?:#.*)?$/u.exec(line)?.[1];
    if (name) { job = { timeout: JOB_DEFAULT_MINUTES, needs: [] }; jobs.set(name, job); continue; }
    if (!job) continue;
    const timeout = /^ {4}timeout-minutes:\s*(.+)$/u.exec(line)?.[1];
    if (timeout !== undefined) {
      const numbers = [...timeout.replace(/#.*$/u, '').matchAll(/\d+/gu)].map((match) => Number(match[0]));
      if (numbers.length) job.timeout = Math.max(...numbers);
    }
    const needs = /^ {4}needs:\s*(.+)$/u.exec(line)?.[1];
    if (needs !== undefined) job.needs = needs.replace(/#.*$/u, '').replace(/[[\]]/gu, '').split(',').map((part) => part.trim()).filter(Boolean);
  }
  if (jobs.size === 0) return undefined;
  const memo = new Map();
  const chain = (name, seen) => {
    if (memo.has(name)) return memo.get(name);
    const row = jobs.get(name);
    if (!row || seen.has(name)) return 0;
    const before = Math.max(0, ...row.needs.map((need) => chain(need, new Set([...seen, name]))));
    memo.set(name, row.timeout + before);
    return row.timeout + before;
  };
  return Math.max(...[...jobs.keys()].map((name) => chain(name, new Set())));
}

/** Room for a hosted runner to pick a ci job up. */
export const GATE_QUEUE_MINUTES = 10;
/** The gate's longest wait: publish.yml's build job limit (150) less the slowest green build (open plots, 43) and setup. */
export const GATE_MAX_MINUTES = 100;
/** A ci run GitHub has not listed yet is waited on this long, then refused. */
export const GATE_APPEAR_MINUTES = 3;

/** How long the gate waits on this SHA's ci: PUBLISH_GATE_WAIT_MINUTES when set, else the repo's ci budget plus queue
 * room, never under the old flat 30 (a small repo's ci may queue) and at most GATE_MAX_MINUTES; 30 when the budget
 * can't be read. */
export function gateWaitMinutes(env, yaml) {
  if (env.PUBLISH_GATE_WAIT_MINUTES !== undefined && env.PUBLISH_GATE_WAIT_MINUTES !== '') return Number(env.PUBLISH_GATE_WAIT_MINUTES);
  const budget = yaml === undefined ? undefined : ciBudgetMinutes(yaml);
  return budget === undefined ? 30 : Math.min(Math.max(budget + GATE_QUEUE_MINUTES, 30), GATE_MAX_MINUTES);
}

/**
 * Judge, and while the verdict says wait, poll until it doesn't or the wait runs out; a wait left at the end refuses.
 * `judge(appearing)` is told whether a ci run not listed yet may still appear.
 */
export async function waitForGate({ judge, waitMinutes, pollMs, now = Date.now, pause = sleep, log = console.log }) {
  const started = now(), deadline = started + waitMinutes * 60_000, appearUntil = started + GATE_APPEAR_MINUTES * 60_000;
  let verdict = await judge(now() < Math.min(appearUntil, deadline));
  while (verdict.wait.length && now() < deadline) {
    log(`gate: waiting (${Math.round((now() - started) / 60_000)} of ${waitMinutes} min): ${verdict.wait.join('; ')}`);
    await pause(pollMs);
    verdict = await judge(now() < Math.min(appearUntil, deadline));
  }
  if (verdict.wait.length) verdict = { ...verdict, refuse: verdict.wait.map((line) => `${line} past the gate's ${waitMinutes}-minute wait: dispatch again when it is green`) };
  return verdict;
}

/** The oldest sdk whose `wildshard prepare` finishes with no `--base` (0.2.11 and 0.2.12 time out at 240 s). */
export const SDK_FLOOR = '0.2.13';

/** A refusal when package.json pins an exact sdk below SDK_FLOOR; a range or a missing pin passes. */
export function sdkPinProblem(pkg) {
  const deps = { ...pkg.devDependencies, ...pkg.dependencies };
  // SA7b: every shard names the sdk by its own name now; the old alias is retired vocabulary in shard repos.
  for (const name of ['@wildshard/sdk']) {
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

/**
 * The upload's committed line and grid lines, from its output; or the queued line of an accepted, cooking upload. Both
 * name the version the API holds the bytes as, which a re-upload of unchanged bytes (QA-11-23-b row 45) takes from the
 * upload that holds them, not from the version asked.
 */
export function uploadLines(log) {
  const lines = log.split('\n').map((line) => line.trim());
  const at = lines.findIndex((line) => /^(committed|already stored): /u.test(line));
  if (at < 0) {
    const queued = lines.find((line) => /^queued: /u.test(line));
    const match = queued && /^queued: (\S+) (\S+) for \S+ \(upload (\S+)\)$/u.exec(queued);
    const id = queued && /\(upload (\S+)\)$/u.exec(queued)?.[1];
    return { committed: undefined, after: [], ...(queued ? { queued, uploadId: id } : {}), ...(match ? { slug: match[1], version: match[2] } : {}) };
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
  let moved;
  const judge = async (appearing) => {
    const [main, runs, workflows] = await Promise.all([
      getJson(`${base}/commits/main`, token),
      getJson(`${base}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&per_page=20`, token),
      getJson(`${base}/actions/workflows?per_page=100`, token),
    ]);
    // Row 56: what main holds past this SHA, read once per tip.
    if (main.sha !== sha && moved?.tip !== main.sha) moved = { tip: main.sha, ...bookkeepingOnly(await getJson(`${base}/compare/${sha}...${main.sha}`, token)) };
    const ring2 = [];
    for (const flow of workflows.workflows.filter((row) => /\/ring-2-[^/]+\.ya?ml$/u.test(row.path))) {
      const latest = await getJson(`${base}/actions/workflows/${flow.id}/runs?branch=main&status=completed&per_page=10`, token);
      const row = latest.workflow_runs.find((run) => run.conclusion !== 'cancelled' && run.conclusion !== 'skipped');
      if (row) ring2.push({ ...row, name: flow.name });
    }
    const judged = gateVerdict({ ref, sha, mainSha: main.sha, ci: runs.workflow_runs, ring2, rehearse: process.env.PUBLISH_REHEARSE === 'true',
      moved: main.sha === sha ? undefined : moved, appearing });
    return { ...judged, ring2: ring2.length, mainSha: main.sha };
  };
  // FR-A3: wait on this SHA's queued or running ci instead of asking for a second dispatch; row 64: through the repo's
  // whole ci budget (its ci.yml), not a flat 30 minutes.
  const flow = existsSync('.github/workflows/ci.yml') ? readFileSync('.github/workflows/ci.yml', 'utf8') : undefined;
  const verdict = await waitForGate({ judge, waitMinutes: gateWaitMinutes(process.env, flow), pollMs: Number(process.env.PUBLISH_GATE_POLL_SECONDS ?? 30) * 1000 });
  for (const line of verdict.warn) console.log(`::warning::rehearsal, not a refusal: ${line}`);
  const sdk = sdkPinProblem(JSON.parse(readFileSync('package.json', 'utf8')));
  if (verdict.refuse.length || sdk) throw new Refusal([...verdict.refuse, ...(sdk ? [sdk] : [])].join('; '));
  const tip = verdict.mainSha === sha ? `is ${ref.replace('refs/heads/', '')}'s tip`
    : `is main's tip but for publish bookkeeping (${BOOKKEEPING.join(', ')}) up to ${String(verdict.mainSha).slice(0, 10)}`;
  summary(`gate: ${sha.slice(0, 10)} ${tip}, its ci is green, ${verdict.ring2} ring-2 workflow(s) green on main`);
}

/** The first of `roots` holding product folders (`<slug>/shard.json`), with their slugs; `list` reads one root. */
export function productRoot(roots, list) {
  for (const root of roots) {
    const slugs = list(root);
    if (slugs.length > 0) return { root, slugs };
  }
  return { root: roots[0], slugs: [] };
}

/** Build the way this repo builds: `build:shards` into out/, else `wildshard build .`, which writes out/<slug> from sdk
 * 0.5.0 on and public/shardfiles/<slug> before it (sdk A7: a 0.5.0 repo has no public/). */
function build(wanted) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
  const shards = Boolean(pkg.scripts?.['build:shards']);
  if (shards) run('pnpm', ['build:shards']);
  else run('pnpm', ['exec', 'wildshard', 'build', '.']);
  const { root, slugs } = productRoot(shards ? ['out'] : ['out', 'public/shardfiles'], (dir) => existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).filter((row) => row.isDirectory() && existsSync(join(dir, row.name, 'shard.json'))).map((row) => row.name).sort()
    : []);
  const slug = pickProduct(slugs, wanted);
  output('slug', slug);
  output('product', join(root, slug));
}

async function version(slug, wanted) {
  output('version', await chooseVersion(slug, wanted, { rehearse: process.env.PUBLISH_REHEARSE === 'true' }));
}

/** CP13: published.json after a publish: one row per slug, merged into what the repo already records. */
export function publishedRecord(existing, row) {
  const rows = existing && typeof existing === 'object' && !Array.isArray(existing) ? existing : {};
  const { slug, ...rest } = row;
  return { ...rows, [slug]: rest };
}

/** CP13: the tag a published revision gets: `r<revision>`, or `<slug>-r<revision>` when `r<revision>` already names
 * another commit (a repo that builds more than one slug). `taken` is the commit `r<revision>` names now, if any. */
export function publishedTag(revision, slug, taken, commit) {
  const plain = `r${revision}`;
  return !taken || taken === commit ? plain : `${slug}-${plain}`;
}

function record(slug, version, revision, hash, channel, commit) {
  if (!/^\d+$/u.test(revision)) throw new Refusal(`no catalogue revision to record for ${slug}: ${revision}`);
  const file = 'published.json';
  const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
  const rows = publishedRecord(existing, { slug, version, revision: Number(revision), hash, channel, commit });
  writeFileSync(file, `${JSON.stringify(rows, null, 2)}\n`);
  let taken = '';
  try {
    taken = execFileSync('git', ['rev-parse', '-q', '--verify', `refs/tags/r${revision}^{commit}`], { encoding: 'utf8' }).trim();
  } catch {
    taken = '';
  }
  output('tag', publishedTag(revision, slug, taken, commit));
}

/**
 * FAST-RELEASE FR-A6 (J505): the API's 409 "these bytes are already <slug> <version>" means nothing new to publish (Pine
 * 11-24 10:42, Nine Dragon 20:58 ended red on it after a full build). The slug and version that hold them, or undefined.
 */
export function sameBytes(log) {
  const match = /these bytes are already (\S+) (\d+\.\d+\.\d+)/u.exec(log);
  return match ? { slug: match[1], version: match[2] } : undefined;
}

/** FR-A6: the upload step's fallback: exit 0 when the refusal was only "these bytes are already", else stay red. */
function unchanged(logFile) {
  const held = sameBytes(readFileSync(logFile, 'utf8'));
  if (!held) throw new Refusal('the upload failed (above)');
  console.log(`::notice::unchanged: these bytes are already ${held.slug} ${held.version}; nothing new to publish`);
}

function report(slug, channel, logFile, shardFile) {
  const log = readFileSync(logFile, 'utf8');
  const parsed = uploadLines(log);
  const held = !parsed.committed && !parsed.queued ? sameBytes(log) : undefined;
  if (held) {
    // FR-A6: no new revision, so no hash output: the cook, pin and record jobs skip.
    summary(`### ${slug} on ${channel}: unchanged\n\nThese bytes are already ${held.slug} ${held.version}; nothing new to publish.`);
    return;
  }
  const hash = parsed.hash ?? (shardFile ? createHash('sha256').update(readFileSync(shardFile)).digest('hex') : undefined);
  if (parsed.queued && parsed.uploadId && hash) {
    // A6: the API accepted the upload and the cook runs on (Pine's take 45 to 52 minutes); this job ends green here and
    // the cook job reports the verdict.
    summary(`### ${slug} on ${channel}: accepted, cooking\n\n~~~text\n${parsed.queued}\n~~~\n\nThe cook job waits for the verdict; by hand: \`pnpm exec wildshard upload status ${parsed.uploadId}\``);
    output('upload_id', parsed.uploadId);
    output('hash', hash);
    if (parsed.version) output('version', parsed.version);
    return;
  }
  if (!parsed.committed) throw new Refusal('the upload printed no committed or queued line');
  summary(`### ${slug} on ${channel}\n\n~~~text\n${[parsed.committed, ...parsed.after].join('\n')}\n~~~`);
  if (parsed.revision !== undefined) {
    output('revision', String(parsed.revision));
    output('hash', parsed.hash);
    output('version', parsed.version);
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
  if (command === 'record' && rest.length === 6) return record(...rest);
  if (command === 'preparation') return preparation();
  if (command === 'summary' && (rest.length === 3 || rest.length === 4)) return report(...rest);
  if (command === 'unchanged' && rest.length === 1) return unchanged(rest[0]);
  if (command === 'cook' && (rest.length === 3 || rest.length === 4)) return cook(rest[0], rest[1], rest[2], rest[3] || undefined);
  throw new Refusal('usage: publish-shard.mjs gate | preparation | build [slug] | version <slug> <repo|X.Y.Z|auto> | record <slug> <version> <revision> <hash> <channel> <commit> | summary <slug> <channel> <log> [shard file] | unchanged <log> | cook <slug> <channel> <hash> [upload id]');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main(process.argv.slice(2)).catch((error) => {
    console.log(`::error::${error instanceof Refusal || error instanceof VersionRefusal ? error.message : error.stack}`);
    process.exit(1);
  });
}
