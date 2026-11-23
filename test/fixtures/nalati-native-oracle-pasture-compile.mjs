import { readFileSync } from 'node:fs';
import { readDecisionSources } from '@wildshard/sdk/buildDecisionScripts';
import { compileReturnProjectionV2 } from '@wildshard/sdk/returnProjectionV2';
import { nalatiTitanRows } from '../../src/generators/stormTitanRows.mjs';

// Recompile the original oracle's pasture input before the herd fuel fix.
// These are the two defining AssemblyScript blobs from singleplayer 65925fa862.
const authored = new Map(readDecisionSources('src'));
for (const file of ['herdBindings.as', 'herdGroup.as']) {
  authored.set(`behaviour/${file}`, readFileSync(new URL(`./nalati-native-oracle-source/${file}`, import.meta.url), 'utf8'));
}
const { programs } = await nalatiTitanRows(compileReturnProjectionV2, authored);
process.stdout.write(JSON.stringify(programs));
