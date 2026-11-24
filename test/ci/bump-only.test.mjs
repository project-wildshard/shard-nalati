// SHARD-COMPAT PR6: an engine or SDK bump needs no shard edit beyond the version. ci21-source's candidate follows
// the installed engine (Nalati keeps no checkpoint baselines).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = process.cwd();

test('no workflow names a fixed default engine commit', () => {
  for (const file of ['ci.yml']) {
    const path = resolve(ROOT, '.github/workflows', file);
    if (!existsSync(path)) continue;
    assert.doesNotMatch(readFileSync(path, 'utf8'), /inputs\.engine \|\| '[0-9a-f]{40}'/u, `${file}: default the candidate to scripts/installed-engine.mjs`);
  }
});
