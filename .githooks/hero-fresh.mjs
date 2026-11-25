// Meta QA 11-25 row 49 (J505): shard-dunes' and shard-sky-reach's mains went red on `[hero-stale]` for hours, because
// a geometry change (QA 11-24 rows 50 and 53) reached main and only main ci's build judged the hero. The push lane now
// judges it first: for each shard source with a hero.json, the SDK's own `wildshard hero <source> --stamp-existing`
// computes the content hash the build compares (stamp.ts, no capture); a hash that differs from the committed stamp,
// or the SDK refusing to stamp over moved content, refuses the push. hero.json is put back byte for byte, so the check writes nothing.
// A curated hero (`"curated": true`) is skipped: the build re-stamps it itself when only the content moved (A6).
// Shard repos only, never shard-showcase (kit.mjs HERO_ONLY). Bypass: SKIP_HERO=1, named in the commit body (J381).
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The shard sources under `root` that carry a hero stamp: `src/` itself, or each `src/shards/<name>/`. */
export function heroSources(root) {
  const sources = existsSync(join(root, 'src/hero.json')) ? ['src'] : [];
  const shards = join(root, 'src/shards');
  if (existsSync(shards)) {
    for (const name of readdirSync(shards).sort()) if (existsSync(join(shards, name, 'hero.json'))) sources.push(`src/shards/${name}`);
  }
  return sources;
}

const contentOf = (text) => {
  try {
    const parsed = JSON.parse(text);
    return { content: typeof parsed?.content === 'string' ? parsed.content : undefined, curated: parsed?.curated === true };
  } catch {
    return { content: undefined, curated: false };
  }
};

/** The refusal for a hero stamped for `stamped` while the source now hashes to `now` (unknown when the SDK refused). */
const staleLine = (source, stamped, now) =>
  `${source}: [hero-stale] the hero is older than its content (stamped ${String(stamped).slice(0, 12)}`
  + `${now === undefined ? '' : `, content now ${String(now).slice(0, 12)}`}); capture it again from a served build: `
  + `pnpm exec wildshard dev ${source}, then pnpm exec wildshard hero ${source} --base <the url it prints>, and commit `
  + 'hero.json with the images';

/**
 * Each stale hero's refusal line, or [] when every hero shows its content.
 * @param {string} root the package root (the push lane's clean copy)
 * @param {(source: string) => {status: number | null, stderr: string}} restamp runs the SDK's no-capture stamp
 */
export function staleHeroes(root, restamp) {
  const stale = [];
  for (const source of heroSources(root)) {
    const file = join(root, source, 'hero.json'), before = readFileSync(file, 'utf8');
    const committed = contentOf(before);
    if (committed.curated) continue;
    let now;
    try {
      const run = restamp(source);
      if (run.status !== 0) {
        // SDK 0.4.31 refuses to stamp over moved content itself ("[hero-failed] ... stamped for other content").
        const last = run.stderr.trim().split('\n').at(-1) ?? '';
        stale.push(/stamped for other content|older than its content/u.test(run.stderr) ? staleLine(source, committed.content, undefined)
          : `${source}: wildshard hero --stamp-existing failed: ${last}`);
        continue;
      }
      now = contentOf(readFileSync(file, 'utf8')).content;
    } finally {
      writeFileSync(file, before);
    }
    if (now !== committed.content) stale.push(staleLine(source, committed.content, now));
  }
  return stale;
}

/** The push lane's step: `pnpm exec wildshard hero <source> --stamp-existing` in `root`. */
export const sdkRestamp = (root, env) => (source) => {
  const run = spawnSync('pnpm', ['exec', 'wildshard', 'hero', source, '--stamp-existing'], { cwd: root, env, encoding: 'utf8' });
  return { status: run.error ? 1 : run.status, stderr: `${run.stderr ?? ''}${run.error?.message ?? ''}` };
};
