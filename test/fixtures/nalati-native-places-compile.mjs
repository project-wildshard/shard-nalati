// Reconstruct the complete original source once per importing test realm, without a disk-cache fallback.
import { readFileSync, writeFileSync } from 'node:fs';
import { serialize } from 'node:v8';
import { nalatiPlacesProgram } from '../../src/generators/placesProgram.ts';
import { hashImmutableBytes } from '@wildshard/format/immutable';
import pins from './nalati-place-wires.json' with { type: 'json' };

const inputs = new Map([
  ['/assets/nalati-grasslands/baked/terrain.bin', readFileSync('src/static/assets/nalati-grasslands/baked/terrain.bin')],
]);
const files = await nalatiPlacesProgram({ cached: (_step, make) => Promise.resolve(make(inputs)) }, 'exact');
for (const name of ['places', 'specimens']) {
  const pin = pins.find(row => row.path === `src/static/assets/nalati-grasslands/baked/${name}.bin`), bytes = files.get(`${name}.bin`);
  if (pin === undefined || bytes === undefined || bytes.byteLength !== pin.bytes || hashImmutableBytes(bytes) !== pin.hash)
    throw new Error(`Original native ${name} binary differs`);
}
const output = process.argv[2];
if (output === undefined) throw new Error('Missing private native place output');
writeFileSync(output, serialize([...files]));
