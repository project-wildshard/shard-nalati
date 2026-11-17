// Candidate helpers use every inherited author rule with file exclusions cleared.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const record = JSON.parse(readFileSync('test/ci21-candidate-ports.json', 'utf8'));
const files = record.typedLintFiles;
assert(Array.isArray(files) && files.length > 0, 'Candidate lint requires its complete compiler closure');
const configuration = JSON.parse(readFileSync('.oxlintrc.ci21-candidate.json', 'utf8'));
assert.deepEqual(configuration, { extends: ['./.oxlintrc.author.json'], ignorePatterns: [] },
  'Candidate lint inherits every author rule and clears only file exclusions');
const args = ['kit/scripts/bin-tools.mjs', '--type-aware', '--tsconfig', 'test/tsconfig.ci21-candidate.json',
  '-c', '.oxlintrc.ci21-candidate.json', '--no-ignore', '--deny-warnings', ...files];
const selection = spawnSync(process.execPath, [...args, '--debug', 'files'], { encoding: 'utf8' });
assert.equal(selection.status, 0, selection.stdout + selection.stderr);
const selected = selection.stdout.trim().split(/\r?\n/u).filter(Boolean).sort();
assert.deepEqual(selected, [...files].sort(), 'Native lint must select every candidate and compiler helper');
console.log(`CI21 native lint selects all ${files.length} compiler-closure files`);
const child = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (child.error !== undefined) throw child.error;
process.exitCode = child.status ?? 1;
