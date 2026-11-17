import * as v from 'valibot';
import { nativeBodySchema } from '@wildshard/format/nativePhysics';
import { nalatiNativeBootRows } from '../../src/generators/nativeServer';
import { NALATI_ADMISSION } from './nalati-admission';
import { nalatiTitanWire } from '../../src/generators/stormTitanProgram';
import { NALATI_RIDING_PROGRAMS } from './nalati-riding';
import { canonicalNativeOracleInput } from './native-oracle';
import { nativeProgramFixture } from './native-program';

const originalPasture = nalatiTitanWire(await nativeProgramFixture({
  id: 'ci21-nalati-original-pasture',
  loader: 'simulation',
  script: 'test/fixtures/nalati-native-oracle-pasture-compile.mjs',
  inputs: ['src', 'package.json', 'pnpm-lock.yaml', 'test/fixtures/nalati-native-oracle-source'],
})).wind;

/** Retain every original authored native identity, stream, recipe and policy.
 * These facts are independent expectations, never derived from the bake. */
const originalBootInputs = () => {
  const rows = nalatiNativeBootRows(originalPasture, NALATI_ADMISSION, NALATI_RIDING_PROGRAMS);
  return { ...rows, recipes: v.parse(v.array(nativeBodySchema('axis')), rows.recipes) };
};

/** Typed construction shared by the parent oracle and its fenced child. */
export function nalatiNativeBootInputs(): ReturnType<typeof originalBootInputs> {
  return canonicalNativeOracleInput(originalBootInputs());
}
