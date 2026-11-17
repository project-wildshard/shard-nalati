import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { checkTestBoundary } from '../../scripts/check-test-boundary.mjs';

function fixture(run) {
  mkdirSync('tmp/codex-tc48', { recursive: true });
  const root = mkdtempSync(resolve('tmp/codex-tc48/boundary-'));
  const put = (name, text) => { const path = resolve(root, name); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };
  put('test/lift-pending.json', '[]');
  put('test/tsconfig.json', JSON.stringify({ files: ['default.test.ts'] }));
  put('test/default.test.ts', 'export const normal = true;');
  put('vitest.config.ts', "export default {test:{exclude:['test/ci21-candidate/**']}};");
  put('test/ci21-candidate-ports.json', JSON.stringify({ files: [{ targetPath: 'test/ci21-candidate/held.test.ts' }] }));
  put('test/ci21-candidate/held.test.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  try { return run(root, put); } finally { rmSync(root, { recursive: true, force: true }); }
}
test('an explicitly held source import requires the candidate engine verdict', () => fixture(root => {
  assert(checkTestBoundary(root).candidateOnly > 0);
  assert.throws(() => checkTestBoundary(root, { candidate: true }), /engine does not export/u);
}));
test('a candidate run admits actual public installed imports', () => fixture((root, put) => {
  put('test/ci21-candidate/held.test.ts', "import '@wildshard/engine/core/rng';");
  assert.doesNotThrow(() => checkTestBoundary(root, { candidate: true }));
}));
test('default reachability through a shared helper cannot hide a missing export', () => fixture((root, put) => {
  put('test/helpers/shared.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('test/default.test.ts', "import './helpers/shared';");
  put('test/ci21-candidate/held.test.ts', "import '../helpers/shared';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('unused helpers retain the original whole-tree import guard', () => fixture((root, put) => {
  put('test/orphan.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('candidate membership and default discovery must agree', () => fixture((root, put) => {
  put('vitest.config.ts', 'export default {test:{exclude:[]}};');
  assert.throws(() => checkTestBoundary(root), /excluded from default discovery/u);
}));
test('candidate coverage cannot reopen the cleared lift queue', () => fixture((root, put) => {
  put('test/lift-pending.json', '["test/ci21-candidate/held.test.ts"]');
  assert.throws(() => checkTestBoundary(root), /cleared lift queue/u);
}));
test('candidate imports cannot cross another shard boundary', () => fixture((root, put) => {
  put('test/ci21-candidate/held.test.ts', "import '../../src/shards/foreign/private';");
  assert.throws(() => checkTestBoundary(root), /imports another shard/u);
}));
test('the real TypeScript resolver follows a JavaScript spelling to shared TypeScript source', () => fixture((root, put) => {
  put('test/helpers/shared.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('test/default.test.ts', "import './helpers/shared.js';");
  put('test/ci21-candidate/held.test.ts', "import '../helpers/shared';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('default Node test entries keep shared helpers on the published boundary', () => fixture((root, put) => {
  put('test/helpers/shared.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('test/native.test.mjs', "import './helpers/shared.ts';");
  put('test/ci21-candidate/held.test.ts', "import '../helpers/shared';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('the existing default variable-import observation keeps its published boundary', () => fixture((root, put) => {
  put('test/fixtures/spruce-author-observation.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('test/default.test.ts', "const target='./fixtures/spruce-author-observation.ts'; void import(target);");
  put('test/ci21-candidate/held.test.ts', "import '../fixtures/spruce-author-observation';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('a normal external script importer keeps a shared helper on the published boundary', () => fixture((root, put) => {
  put('test/fixtures/shared.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('scripts/entry.mjs', "import '../test/fixtures/shared.ts';");
  put('test/ci21-candidate/held.test.ts', "import '../fixtures/shared';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));

test('reward candidates require their explicit installed runtime verdict', () => fixture((root, put) => {
  put('test/reward-candidate.json', JSON.stringify({files:['test/reward-candidate/reward.test.mjs']}));
  put('test/reward-candidate/reward.test.mjs', "import '@wildshard/engine/__reward_missing_export__';");
  assert.doesNotThrow(() => checkTestBoundary(root));
  assert.throws(() => checkTestBoundary(root, {rewards:true}), /engine does not export/u);
  assert.throws(() => checkTestBoundary(root, {candidate:true}), /engine does not export/u);
}));
test('a default importer cannot hide behind reward candidate membership', () => fixture((root, put) => {
  put('test/reward-candidate.json', JSON.stringify({files:['test/reward-candidate/reward.test.mjs']}));
  put('test/reward-candidate/reward.test.mjs', "import '@wildshard/engine/__reward_missing_export__';");
  put('test/default.test.ts', "import './reward-candidate/reward.test.mjs';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('every reward candidate has exactly one declared entry', () => fixture((root, put) => {
  put('test/reward-candidate/reward.test.mjs', 'export const wholeReward = true;');
  assert.throws(() => checkTestBoundary(root), /Every reward candidate/u);
}));

test('explicit native child compiler roots retain their candidate engine boundary', () => fixture((root, put) => {
  put('test/ci21-candidate/held.test.ts', 'export const childProof = true;');
  put('test/fixtures/headless/native-run.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('test/ci21-candidate-ports.json', JSON.stringify({files:[{targetPath:'test/ci21-candidate/held.test.ts',compilerSupport:['test/fixtures/headless/native-run.ts']}]}));
  assert.doesNotThrow(() => checkTestBoundary(root));
  assert.throws(() => checkTestBoundary(root,{candidate:true}), /engine does not export/u);
  put('test/default.test.ts', "import './fixtures/headless/native-run';");
  assert.throws(() => checkTestBoundary(root), /engine does not export/u);
}));
test('candidate native compiler support cannot hide production or arbitrary test roots', () => fixture((root, put) => {
  put('src/hidden.ts', "import '@wildshard/engine/__ci21_missing_export__';");
  put('test/ci21-candidate-ports.json', JSON.stringify({files:[{targetPath:'test/ci21-candidate/held.test.ts',compilerSupport:['src/hidden.ts']}]}));
  assert.throws(() => checkTestBoundary(root), /explicit maintained fixture modules/u);
}));
