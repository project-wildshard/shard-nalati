// Call the defining production builder with the real SDK compiler.
import { readDecisionSources, compileDecisionScripts } from '@wildshard/sdk/buildDecisionScripts';
import { nalatiChargeRows } from '../../src/generators/chargeRows.ts';
const built = await nalatiChargeRows((input, registries, authored, options) =>
  compileDecisionScripts(input, registries, authored, { ...options }), readDecisionSources('src'));
process.stdout.write(`${JSON.stringify({rows:built.rows,wasm:Buffer.from(built.wasm).toString('base64')})}\n`);
