import * as v from 'valibot';
import { hashImmutableBytes } from '@wildshard/format/immutable';
// oxlint-disable-next-line import/no-nodejs-modules -- Compile the complete source oracle in its native realm.
import { execFileSync } from 'node:child_process';
// oxlint-disable-next-line import/no-nodejs-modules -- Own and remove the native compiler's private output.
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Keep compiler output beneath repository scratch.
import { resolve } from 'node:path';
// oxlint-disable-next-line import/no-nodejs-modules -- Preserve exact bytes without a base64 transport envelope.
import { deserialize } from 'node:v8';
import pins from './nalati-place-wires.json' with { type: 'json' };

mkdirSync('tmp', { recursive: true });
const root = mkdtempSync(resolve('tmp/nalati-native-place-source-'));
const expected = ['places.bin', 'places.json', 'specimens.bin', 'placeSpecimens.json', 'placeParts.json',
  'actor:balbal:0:2977.bin', 'actor:balbal:1:2977.bin', 'actor:goat.bin'];
const files = new Map<string, Uint8Array<ArrayBuffer>>();
try {
  const output = resolve(root, 'files.v8');
  execFileSync(process.execPath, ['--experimental-transform-types', '--import',
    import.meta.resolve('@wildshard/engine/scripts/bake-loader.mjs'), 'test/fixtures/nalati-native-places-compile.mjs', output],
  { timeout: 14_000, stdio: ['ignore', 'pipe', 'pipe'] });
  const raw: unknown = deserialize(readFileSync(output));
  const rows = v.parse(v.array(v.tuple([v.string(), v.instance(Uint8Array)])), raw);
  for (const [name, bytes] of rows) {
    if (!expected.includes(name) || files.has(name)) throw new Error('Original native place inventory differs');
    files.set(name, Uint8Array.from(bytes));
  }
  if (files.size !== expected.length) throw new Error('Original native place inventory differs');
  for (const name of ['places', 'specimens']) {
    const pin = pins.find(row => row.path === `public/assets/nalati/baked/${name}.bin`), bytes = files.get(`${name}.bin`);
    if (pin === undefined || bytes === undefined || bytes.length !== pin.bytes || hashImmutableBytes(bytes) !== pin.hash)
      throw new Error(`Original native ${name} binary differs`);
  }
} finally { rmSync(root, { recursive: true, force: true }); }

/** One cold build per importing realm, including committedPlaces users; every loan is detached. */
export function nativePlaceFile(name: string): Uint8Array<ArrayBuffer> {
  const bytes = files.get(name);
  if (bytes === undefined) throw new Error(`Missing owned native place file ${name}`);
  return bytes.slice();
}
