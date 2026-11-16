// Compile each declared view through the production module builder and real SDK compiler.
import { readFileSync } from 'node:fs';
import { compileScriptV2 } from '@wildshard/sharddev/compileScriptV2';
import { SCRIPT_V2_REVISIONS } from '@wildshard/format/scriptAdmissionV2';
import { NALATI_VIEW_MODULES, nalatiViewModules } from '../../src/generators/viewPrograms.ts';
const rows = {};
await nalatiViewModules({ compileScriptV2: (source, options) => compileScriptV2(source, {...options}),
  cached: async (step, generate) => {
    const files = await generate(new Map(step.inputs.map(name=>[name,readFileSync(`src/${name}`)])));
    const row = NALATI_VIEW_MODULES.find(row=>`view-${row.id}`===step.id);
    if(row===undefined || !files.has('view.wasm'))throw new Error('Missing defining view module');
    rows[row.id]=Buffer.from(files.get('view.wasm')).toString('base64');return files;
  } }, SCRIPT_V2_REVISIONS);
process.stdout.write(`${JSON.stringify(rows)}\n`);
