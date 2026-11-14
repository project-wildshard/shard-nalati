// GR6: compile Nalati's mounts / taming / riding program in plain Node (a happy-dom test environment cannot feed the
// compiler) through the shard's own builder, and print { programs, wasm, witness } (base64) as one JSON line.
import { readFileSync } from 'node:fs';
import { compileReturnProjectionV2 } from '@wildshard/sharddev/returnProjectionV2';
import { memoAssemblyScript } from '@wildshard/sharddev/bake/assemblyscriptMemo';
import { nalatiRidingRows } from '../../src/generators/ridingRows.mjs';
import { NALATI_ECOLOGY as ecology } from '../../src/generators/ecology.mjs';

const root = 'src/';
const { programs, wasm, witness } = await nalatiRidingRows((input, registries, authored, options) =>
  compileReturnProjectionV2(input, registries, authored, { ...options, compileMemo: memoAssemblyScript }), source => readFileSync(`${root}${source}`, 'utf8'), ecology);
process.stdout.write(`${JSON.stringify({ programs, wasm: Buffer.from(wasm).toString('base64'), witness: Buffer.from(witness).toString('base64') })}\n`);
