import { expect, test } from 'vitest';
import { encodeCanonicalJson, hashImmutableBytes } from '@wildshard/format/immutable';
import { fencedNativeOracle } from '../fixtures/native-oracle';
import { nalatiNativeBootInputs } from '../fixtures/nalati-native-boot-inputs';
import { nalatiNativeAssemblyInputs } from '../fixtures/nalati-native-assembly-inputs';

const inputs = ['src', 'package.json', 'pnpm-lock.yaml', 'test/fixtures'];
const nalatiNativeBoot = () => fencedNativeOracle({ id: 'ci21-nalati-boot', loader: 'simulation', script: 'test/fixtures/nalati-native-boot-compile.mjs', inputs }, nalatiNativeBootInputs);
const nalatiNativeAssembly = () => fencedNativeOracle({ id: 'ci21-nalati-assembly', loader: 'simulation', transformTypes: true, script: 'test/fixtures/nalati-native-assembly-compile.mjs', inputs }, () => nalatiNativeAssemblyInputs());

test('the fenced typed Nalati oracle retains every former boot byte', async () => {
  const rows = await nalatiNativeBoot(), ordered = `${JSON.stringify(rows)}\n`;
  expect(ordered).toBe(encodeCanonicalJson(rows));
  const wire = new TextEncoder().encode(ordered);
  expect(wire.byteLength).toBe(109461);
  expect(hashImmutableBytes(wire)).toBe('73495b73fb1f983c9508ede352b75bd9782f41445a70408171336194a66f4c72');
});

test('the fenced typed Nalati oracle retains every former assembly byte', async () => {
  const rows = await nalatiNativeAssembly(), ordered = `${JSON.stringify(rows)}\n`;
  expect(ordered).toBe(encodeCanonicalJson(rows));
  const wire = new TextEncoder().encode(ordered);
  // The three lairs' first-kill skins are all this oracle has gained: every former byte holds around them.
  const skins = /"drop":\{"skin":(?:null|"[^"]*")\},/gu;
  expect(ordered.match(skins)).toEqual(['"drop":{"skin":"irbis-sabre"},', '"drop":{"skin":null},', '"drop":{"skin":"sky-wolf-bow"},']);
  const former = new TextEncoder().encode(ordered.replaceAll(skins, ''));
  expect(wire.byteLength).toBe(32432);
  expect(former.byteLength).toBe(32350);
  expect(hashImmutableBytes(former)).toBe('fc2060b6659b3f8163a1ad393168264e8e3c4e172398bd4b6dcefcac724f2047');
});
