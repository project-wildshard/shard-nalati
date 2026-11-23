import { expect, test } from 'vitest';
import { encodeCanonicalJson, hashImmutableBytes } from '@wildshard/sdk/immutable';
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
  expect(wire.byteLength).toBe(109260);
  expect(hashImmutableBytes(wire)).toBe('ca7177cab3fdb44d9841fe90e9361ab15896620c6c67070ef713eb0a2597a683');
});

test('the fenced typed Nalati oracle retains every former assembly byte', async () => {
  const rows = await nalatiNativeAssembly(), ordered = `${JSON.stringify(rows)}\n`;
  expect(ordered).toBe(encodeCanonicalJson(rows));
  const wire = new TextEncoder().encode(ordered);
  // The three lairs' first-kill skins are all this oracle has gained: every former byte holds around them. ONE-FORMAT OF24
  // moved the ride's gaits onto the declared horse (`mount.gaits`), so the 58-byte `"speeds"` row left `nativeRide`.
  const skins = /"drop":\{"skin":(?:null|"[^"]*")\},/gu;
  expect(ordered.match(skins)).toEqual(['"drop":{"skin":"irbis-sabre"},', '"drop":{"skin":null},', '"drop":{"skin":"sky-wolf-bow"},']);
  const former = new TextEncoder().encode(ordered.replaceAll(skins, ''));
  expect(wire.byteLength).toBe(32374);
  expect(former.byteLength).toBe(32292);
  expect(hashImmutableBytes(former)).toBe('b7e76c21d05706e13870c9061c5e02db1316628caee25a56a32de2aba328ddf2');
});
