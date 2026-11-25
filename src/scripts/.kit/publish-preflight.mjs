#!/usr/bin/env node
// QA-11-23-b row 44 (J505): refuse a publish at once when the channel's cook cannot read the format this shard's SDK
// writes. SDK 0.4.30 writes shard-format 0.74.1; staging's cook (v0.1.79) read 0.73.0 and refused Driftwood's and
// Pine's uploads ("Invalid key: Expected capabilities") about 30 minutes into each run. Kit-owned; edit it in
// repo-kit, never in a shard repo.
//
//   node src/scripts/.kit/publish-preflight.mjs <staging|prod>
//
// Runs after the install, before the build. The channel's engine is the build its page serves (`<origin>/version.json`,
// deployed with the cook); its format is that engine's `@wildshard/format`, from npm (a `-next` release names its
// commit as gitHead) or the engine's package.json at that commit (GH_TOKEN, the org app token). The writer is the
// installed SDK's `@wildshard/format`. A newer format minor than the cook reads refuses, naming the engine the SDK is
// built on; a patch is compatible. When the channel's engine or format can't be read, it warns and goes on. With
// PUBLISH_REHEARSE=true a refusal is a warning: a rehearsal never uploads.
//
// QA-11-23-b row 47 (J505): when it knows the slug (PUBLISH_SLUG, the dispatch's `slug`, or the one slug published.json
// records), it also picks the version as the version step will (PUBLISH_VERSION: repo, X.Y.Z or auto) and refuses one
// that other bytes already hold, refused uploads included, naming the next free version. The version step runs the same
// check after the build for a repo whose slug only the build names.
import { agentFetch as fetch } from './wildshard-agent-requests.mjs';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chooseVersion, Refusal } from './publish-version.mjs';

const ORIGINS = { staging: 'https://staging.wildshard.io', production: 'https://play.wildshard.io' };
/** The cooks an upload on each publish channel reaches: staging moves preview and staging, prod all three. */
export const COOKS = { staging: ['staging'], prod: ['staging', 'production'] };
const REGISTRY = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org';
const GITHUB = process.env.GITHUB_API_URL || 'https://api.github.com';
const API = process.env.WILDSHARD_API_URL || 'https://api.wildshard.io';
const VERSION = /(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/u;

/** `npm:@wildshard/shard-format@0.74.1`, `^0.74.1` or `0.74.1` as `0.74.1`; undefined when none. */
export function formatOf(spec) {
  return typeof spec === 'string' ? VERSION.exec(spec)?.[0] : undefined;
}

/**
 * Why `cook` (the channel's engine, reading format `reads`) can't admit a file written by format `writes`, or
 * undefined when it can. 0.x formats break on a minor; a patch is compatible.
 */
export function cookFormatProblem({ writes, reads, channel, engine, build, sdk, sdkEngine }) {
  const [w, r] = [VERSION.exec(writes), VERSION.exec(reads)];
  if (!w || !r) return undefined;
  const ahead = Number(w[1]) !== Number(r[1]) ? Number(w[1]) > Number(r[1]) : Number(w[2]) > Number(r[2]);
  if (!ahead) return undefined;
  const at = `${engine ? `engine v${engine}` : 'its engine'}${build ? ` (build ${build.slice(0, 8)})` : ''}`;
  return `SDK ${sdk} writes shard-format ${writes}, but ${channel}'s cook, ${at}, reads ${reads} and would refuse the upload after the build: ` +
    `${channel} needs an engine on shard-format ${w[1]}.${w[2]} or newer${sdkEngine ? ` (this SDK is built on engine ${sdkEngine})` : ''}. ` +
    `Publish once ${channel} runs it, or keep this shard on an SDK that writes ${r[1]}.${r[2]}.`;
}

/** The installed SDK's version, the format it writes and the engine it is built on. */
export function installedWriter(root = process.cwd()) {
  const requireRoot = createRequire(pathToFileURL(join(root, 'package.json')));
  const sdkFile = requireRoot.resolve('@wildshard/sdk/package.json');
  const sdk = JSON.parse(readFileSync(sdkFile, 'utf8'));
  const fromSdk = createRequire(sdkFile);
  const installed = name => {
    try { return JSON.parse(readFileSync(fromSdk.resolve(`${name}/package.json`), 'utf8')).version; } catch { return undefined; }
  };
  const writes = installed('@wildshard/format') ?? formatOf(sdk.dependencies?.['@wildshard/format']);
  const sdkEngine = installed('@wildshard/engine') ?? formatOf(sdk.devDependencies?.['@wildshard/engine']);
  return { sdk: sdk.version, writes, sdkEngine };
}

async function json(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

/** The format the engine at `build` reads: npm first, then its package.json on GitHub. */
export async function engineFormat(build, token = process.env.GH_TOKEN) {
  try {
    const packument = await json(`${REGISTRY}/@wildshard%2fengine`);
    const row = Object.values(packument.versions ?? {}).find(version => version.gitHead === build);
    const reads = formatOf(row?.dependencies?.['@wildshard/format']);
    if (reads) return reads;
  } catch { /* npm unreachable: try GitHub */ }
  if (!token) return undefined;
  const pkg = await json(`${GITHUB}/repos/project-wildshard/engine/contents/package.json?ref=${build}`, {
    authorization: `Bearer ${token}`, accept: 'application/vnd.github.raw+json',
  });
  return formatOf(pkg.dependencies?.['@wildshard/format']);
}

/** The slug this publish uploads, when known before the build: the dispatch's, else published.json's only one. */
export function knownSlug(env = process.env, root = process.cwd()) {
  if (env.PUBLISH_SLUG) return env.PUBLISH_SLUG;
  const file = join(root, 'published.json');
  if (existsSync(file)) {
    const slugs = Object.keys(JSON.parse(readFileSync(file, 'utf8')) ?? {});
    if (slugs.length === 1) return slugs[0];
  }
  // FAST-RELEASE FR-A4 (11-25): a one-product repo's discovery source names its slug, so a repo that never published
  // back (Pine, Nine, Nalati, Driftwood) is still checked before the build
  const manifest = join(root, 'src/manifest.json');
  if (!existsSync(manifest)) return undefined;
  try {
    const slug = JSON.parse(readFileSync(manifest, 'utf8'))?.slug;
    return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) ? slug : undefined;
  } catch { return undefined; }
}

/**
 * FAST-RELEASE FR-A4 (11-25): `repo` publishes package.json's version, and a shard repo still on the template's 0.0.0
 * refused at the version step after a full build (Pine, Nine, Nalati and Driftwood's staging republishes on v0.1.89).
 * That refusal needs no slug: it runs before the build whatever the repo builds. Undefined when the version can go on.
 */
export function ownVersionProblem(wanted, own) {
  if ((wanted || 'repo') !== 'repo') return undefined;
  if (typeof own === 'string' && /^\d+\.\d+\.\d+$/u.test(own) && own !== '0.0.0') return undefined;
  return `package.json declares no shard version X.Y.Z (${own ?? 'none'}): set "version" above the catalogue's (the API's newest for the slug plus one), commit it and publish again, or dispatch with -f version=auto (CP13, refused before the build, FAST-RELEASE FR-A4)`;
}

/**
 * FAST-RELEASE FR-A5 (J505): "the hero is unchanged since <slug> <version>" was 14 of 29 upload refusals (11-16..24), each
 * after a 3 to 17 minute build. The upload's own check compares sharddev's card digest (`cardDigest`: sha256 over
 * `thumb:<h>`, `portrait:<h>`, `landscape:<h>`, each h the image's sha256) with the catalogue's newest `heroHash`.
 * src/hero.json's `card` names the same three hashes, so the preflight can refuse first. Undefined when it has no card.
 */
export function heroDigest(hero) {
  const card = Object.entries(hero?.card ?? {});
  const slot = (test) => card.find(([name]) => test(name))?.[1];
  const thumb = slot((name) => !/-(?:portrait|landscape)\.[a-z0-9]+$/u.test(name));
  const portrait = slot((name) => /-portrait\.[a-z0-9]+$/u.test(name));
  const landscape = slot((name) => /-landscape\.[a-z0-9]+$/u.test(name));
  if (card.length !== 3 || ![thumb, portrait, landscape].every((hash) => /^[0-9a-f]{64}$/u.test(hash ?? ''))) return undefined;
  return createHash('sha256').update([`thumb:${thumb}`, `portrait:${portrait}`, `landscape:${landscape}`].join('\n')).digest('hex');
}

/** FR-A5: the upload's hero refusal, before the build. A curated hero, a first version and a retry of the newest pass, as there. */
export function heroProblem({ slug, hero, row, version }) {
  if (!hero || hero.curated === true || !row?.heroHash) return undefined;
  if (heroDigest(hero) !== row.heroHash || row.version === version) return undefined;
  return `the hero is unchanged since ${slug} ${row.version}: run wildshard hero, commit src/hero.json and the card, push, then publish (refused before the build, FAST-RELEASE FR-A5)`;
}

/** QA-11-23-b row 47: refuse a taken version before the build; FR-A5: and an unchanged hero. True when refused. */
async function versionRefused(rehearse) {
  const own = existsSync('package.json') ? JSON.parse(readFileSync('package.json', 'utf8')).version : undefined;
  const ownProblem = ownVersionProblem(process.env.PUBLISH_VERSION, own);
  if (ownProblem) { console.log(`::${rehearse ? 'warning' : 'error'}::${ownProblem}`); return !rehearse; }
  const slug = knownSlug();
  if (!slug) { console.log('publish-preflight: the build names the slug; the version step checks the version after it'); return false; }
  try {
    const version = await chooseVersion(slug, process.env.PUBLISH_VERSION || 'repo', { rehearse });
    console.log(`publish-preflight: ${slug} ${version} is free, or holds these same sources`);
    if (existsSync('src/hero.json')) {
      const catalogue = await json(`${API}/api/catalogue`);
      const problem = heroProblem({ slug, hero: JSON.parse(readFileSync('src/hero.json', 'utf8')), row: catalogue.shards?.find((shard) => shard.slug === slug), version });
      if (problem) throw new Refusal(problem);
      console.log(`publish-preflight: ${slug}'s hero is new since the catalogue's newest, curated, or a retry of it`);
    }
    return false;
  } catch (error) {
    // A refusal stops the run (a rehearsal only warns); an API or git hiccup leaves it to the version step.
    const stop = error instanceof Refusal && !rehearse;
    console.log(`::${stop ? 'error' : 'warning'}::${error.message}`);
    return stop;
  }
}

async function main(channel) {
  if (!COOKS[channel]) { console.log(`::error::publish-preflight: unknown channel ${channel ?? '(none)'}; one of ${Object.keys(COOKS).join(', ')}`); return 1; }
  const rehearse = process.env.PUBLISH_REHEARSE === 'true';
  const writer = installedWriter();
  if (!writer.writes) { console.log(`::warning::publish-preflight: SDK ${writer.sdk} names no @wildshard/format; not checked`); return (await versionRefused(rehearse)) ? 1 : 0; }
  let refused = false;
  for (const cook of COOKS[channel]) {
    let page, reads;
    try {
      page = await json(`${ORIGINS[cook]}/version.json`);
      if (!/^[0-9a-f]{40}$/u.test(page.build ?? '')) throw new Error(`no engine build in ${ORIGINS[cook]}/version.json`);
      reads = await engineFormat(page.build);
    } catch (error) {
      console.log(`::warning::publish-preflight: could not read ${cook}'s cook format (${error.message}); not checked`);
      continue;
    }
    if (!reads) { console.log(`::warning::publish-preflight: no format for ${cook}'s engine ${page.build.slice(0, 8)} (npm or GH_TOKEN); not checked`); continue; }
    const problem = cookFormatProblem({ ...writer, reads, channel: cook, engine: page.clientVersion, build: page.build });
    if (problem) { console.log(`::${rehearse ? 'warning' : 'error'}::${problem}`); refused = !rehearse; }
    else console.log(`publish-preflight: ${cook}'s cook (engine v${page.clientVersion}, format ${reads}) reads SDK ${writer.sdk}'s format ${writer.writes}`);
  }
  if (await versionRefused(rehearse)) refused = true;
  return refused ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv[2]);
