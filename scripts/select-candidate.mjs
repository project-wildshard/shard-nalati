// Ring 3 overrides the entire dependency graph, not only the direct edge.
// An empty input keeps the checked-in frozen install. Candidates are exact
// commit hashes, never executable shell fragments or moving branches.
import { readFileSync, writeFileSync } from 'node:fs';
const choices = [['engine', process.env.CANDIDATE_ENGINE], ['sharddev', process.env.CANDIDATE_SHARDDEV]];
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const [name, sha] of choices) {
  if (!sha) continue;
  if (!/^[a-f0-9]{40}$/u.test(sha)) throw new Error(`${name}: candidate must be a full commit hash`);
  const spec = `github:project-wildshard/${name}#${sha}`;
  const key = `@wildshard/${name}`;
  const edges = pkg.dependencies[key] === undefined && pkg.devDependencies?.[key] !== undefined
    ? pkg.devDependencies : pkg.dependencies;
  edges[key] = spec;
  pkg.pnpm ??= {}; pkg.pnpm.overrides ??= {};
  pkg.pnpm.overrides[`@wildshard/${name}`] = spec;
}
// A shard's old global format override must not replace the candidate
// engine's own schema dependency: newer engine exports require its version.
if (choices[0][1]) delete pkg.pnpm.overrides['@wildshard/format'];
// QA-FEEDBACK-2026-11-23-b row 41: Nalati's own format edge (and the sdk's) pinned shard-format 0.71.0 beside the candidate
// engine's newer copy, so test/ci21-candidate/* passed values typed by one into functions typed by the other (Ring 3 run
// 45329075077). A candidate run resolves the one @wildshard/format the candidate engine declares.
if (choices[0][1]) {
  const read = await fetch(`https://raw.githubusercontent.com/project-wildshard/engine/${choices[0][1]}/package.json`, {signal: AbortSignal.timeout(20_000)});
  if (!read.ok) throw new Error(`engine ${choices[0][1]}: package.json HTTP ${read.status}`);
  const format = (await read.json()).dependencies?.['@wildshard/format'];
  const bare = typeof format === 'string' ? /^npm:@wildshard\/shard-format@(.+)$/u.exec(format)?.[1] : undefined;
  if (format === undefined || bare === undefined) throw new Error(`engine ${choices[0][1]} declares no npm shard-format (${String(format)})`);
  pkg.dependencies['@wildshard/format'] = format;
  for (const key of Object.keys(pkg.pnpm.overrides)) {
    if (key.endsWith('>@wildshard/format')) pkg.pnpm.overrides[key] = format;
    else if (key.endsWith('>@wildshard/shard-format')) pkg.pnpm.overrides[key] = bare;
  }
}
// Backport e7bd251be's timer type only for the archived v0.1.54 source tarball.
if (process.env.CANDIDATE_ENGINE === '6bab8fcc4c5949b85f47211918f1f68af15d2ed4') {
  pkg.pnpm.patchedDependencies ??= {};
  pkg.pnpm.patchedDependencies['@wildshard/engine@0.1.54'] = 'patches/engine-0.1.54-toast-timer.patch';
}
if (choices.some(([, value]) => value)) writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
