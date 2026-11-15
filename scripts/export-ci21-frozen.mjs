import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.argv[2] ?? '../engine/test/fixtures/frozen/nalati');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const files = [
  'nalati-admission-original.json',
  'nalati-admission-original.wasm',
  'nalati-admission-witness-original.bin',
  'nalati-geography-files.json',
  'nalati-geography-original.bin',
  'nalati-geography-original.json',
  'nalati-goldenKing-original.json',
  'nalati-held-files.json',
  'nalati-poi-paint-original.json',
  'nalati-poi-shapes-original.bin',
  'nalati-population-field-original.json',
  'nalati-shape-book-original.json',
  'nalati-strikeProfiles-original.json',
  'nalati-weather-original.json',
];

mkdirSync(target, { recursive: true });
const manifest = [];
for (const name of files) {
  const source = resolve('test/fixtures', name);
  const destination = resolve(target, name);
  cpSync(source, destination);
  const bytes = readFileSync(destination);
  manifest.push({ name, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') });
}
writeFileSync(resolve(target, 'manifest.json'), `${JSON.stringify({
  sourceCommit,
  exporter: 'scripts/export-ci21-frozen.mjs',
  files: manifest,
}, null, 2)}\n`);
