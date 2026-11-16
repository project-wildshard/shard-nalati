// Call the defining round/course builder with the same complete source inventory.
import { readFileSync } from 'node:fs';
import { readDecisionSources, compileDecisionScripts } from '@wildshard/sharddev/buildDecisionScripts';
import { nalatiKokparRows } from '../../src/generators/kokparRows.ts';
const built = await nalatiKokparRows((input, registries, authored, options) =>
  compileDecisionScripts(input, registries, authored, { ...options }), readDecisionSources('src'),
  readFileSync(new URL(import.meta.resolve('@wildshard/sharddev/commons/scripts/course.as')), 'utf8'));
process.stdout.write(`${JSON.stringify({rows:built.rows,wasm:Buffer.from(built.wasm).toString('base64'),courseWasm:Buffer.from(built.courseWasm).toString('base64')})}\n`);
