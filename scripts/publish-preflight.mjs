#!/usr/bin/env node
// QA-11-23-b row 44 (J505): refuse a publish at once when the channel's cook cannot read the format this shard's SDK
// writes. SDK 0.4.30 writes shard-format 0.74.1; staging's cook (v0.1.79) read 0.73.0 and refused Driftwood's and
// Pine's uploads ("Invalid key: Expected capabilities") about 30 minutes into each run. Kit-owned; edit it in
// repo-kit, never in a shard repo.
//
//   node scripts/publish-preflight.mjs <staging|prod>
//
// Runs after the install, before the build. The channel's engine is the build its page serves (`<origin>/version.json`,
// deployed with the cook); its format is that engine's `@wildshard/format`, from npm (a `-next` release names its
// commit as gitHead) or the engine's package.json at that commit (GH_TOKEN, the org app token). The writer is the
// installed SDK's `@wildshard/format`. A newer format minor than the cook reads refuses, naming the engine the SDK is
// built on; a patch is compatible. When the channel's engine or format can't be read, it warns and goes on. With
// PUBLISH_REHEARSE=true a refusal is a warning: a rehearsal never uploads.
import { agentFetch as fetch } from './wildshard-agent-requests.mjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGINS = { staging: 'https://staging.wildshard.io', production: 'https://play.wildshard.io' };
/** The cooks an upload on each publish channel reaches: staging moves preview and staging, prod all three. */
export const COOKS = { staging: ['staging'], prod: ['staging', 'production'] };
const REGISTRY = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org';
const GITHUB = process.env.GITHUB_API_URL || 'https://api.github.com';
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

async function main(channel) {
  if (!COOKS[channel]) { console.log(`::error::publish-preflight: unknown channel ${channel ?? '(none)'}; one of ${Object.keys(COOKS).join(', ')}`); return 1; }
  const writer = installedWriter();
  if (!writer.writes) { console.log(`::warning::publish-preflight: SDK ${writer.sdk} names no @wildshard/format; not checked`); return 0; }
  const rehearse = process.env.PUBLISH_REHEARSE === 'true';
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
  return refused ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exitCode = await main(process.argv[2]);
