// SHARD-COMPAT PR6: the ci21-source candidate defaults to the engine this shard's SDK installs, so an engine or SDK
// bump moves it with no workflow edit. Prints that engine's exact commit (its published package's gitHead).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const fromSdk = createRequire(createRequire(import.meta.url).resolve('@wildshard/sdk/package.json'));
const engine = JSON.parse(readFileSync(fromSdk.resolve('@wildshard/engine/package.json'), 'utf8'));
if (!/^[a-f0-9]{40}$/u.test(engine.gitHead ?? '')) throw new Error(`@wildshard/engine ${engine.version} names no exact commit (gitHead); pass the candidate as the engine input`);
console.log(engine.gitHead);
