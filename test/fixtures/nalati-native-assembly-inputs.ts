import { PageTamingBindingSchema } from '@wildshard/format/riding';
import * as v from 'valibot';
import { nalatiNativeAssemblyRows } from '../../src/generators/nativeServer';
import { nalatiNativeGroupWire } from '../../src/generators/nativeGroupWire';
import { nalatiNativeShelters } from '../../src/generators/shelters';
import { NALATI_PASTURE } from './nalati-titan';
import { NALATI_ADMISSION } from './nalati-admission';
// oxlint-disable-next-line import/no-nodejs-modules -- The parent retains independent original collider expectations.
import { readFileSync } from 'node:fs';
import { hashImmutableBytes } from '@wildshard/format/immutable';
import { canonicalNativeOracleInput } from './native-oracle';

/** Original independent native facts, including policy and expectation rows.
 * No expected entry count or native policy is inferred from checked geometry. */
function originalPlaces(): unknown {
  const bytes = readFileSync('test/fixtures/nalati-places-original.json');
  if (bytes.byteLength !== 1506858 || hashImmutableBytes(bytes) !== 'fbe66ce2b4050879276a2878bb8de2ede6171625b8b1bf1b13431e8031d75384')
    throw new Error('Original native place metadata differs');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

/** SA20 moved these two calls to named hosts. Check the live binding before
 * spelling it as the original wire from singleplayer 65925fa862. */
function originalHostCall([callee, ...args]: readonly unknown[], name: string, originalModule: string) {
  v.parse(v.strictObject({ $ref: v.strictTuple([v.literal('host'), v.literal(name)]) }), callee);
  return [{ $ref: [originalModule, name] }, ...args];
}

function buildNativeAssemblyInputs(placed: unknown = originalPlaces()) {
  const places = v.parse(v.object({ rows: v.array(v.object({ colliders: v.array(v.object({
    hw: v.number(), hd: v.number(), yTop: v.number(), yBottom: v.number(), x: v.number(), z: v.number(),
  })) })) }), placed);
  const assembly = nalatiNativeAssemblyRows(NALATI_PASTURE, NALATI_ADMISSION, nalatiNativeShelters(places));
  const { pageWildlife, pageGroups: _pageGroups, groupAdmission: _groupAdmission, nativeField: _nativeField,
    nativeDayClock: _nativeDayClock, nativeKnockdown: _nativeKnockdown, ...constants } = assembly.constants;
  const riding = constants.nativePopulation;
  const variantRows = (variant: typeof riding.variants[number]['rows'][number]) => ({ ...variant, scale: v.parse(v.tuple([v.number(), v.number()]), variant.scale) });
  const groupRows = (row: typeof riding.variants[number]) => ({ ...row, rows: row.rows.map(variantRows) });
  return canonicalNativeOracleInput({ ...assembly,
    level: { ...assembly.level, speed: { ...assembly.level.speed,
      $call: originalHostCall(assembly.level.speed.$call, 'clamp', '@wildshard/engine/core/noise') } },
    entries: { ...assembly.entries, $fn: { ...assembly.entries.$fn,
      $call: originalHostCall(assembly.entries.$fn.$call, 'proveTerrainEntries', '@wildshard/game/plugin/mover') } },
    constants: { ...constants,
    groupRows: nalatiNativeGroupWire(constants.groupRows, pageWildlife.pasture),
    nativeTaming: { ...constants.nativeTaming, binding: v.parse(PageTamingBindingSchema, constants.nativeTaming.binding) },
    nativePopulation: { ...riding, shepherdOffset: v.parse(v.tuple([v.number(), v.number()]), riding.shepherdOffset),
      variants: riding.variants.map(groupRows) },
  } });
}

/** Preserve the complete inferred constructor contract at the exported boundary. */
export function nalatiNativeAssemblyInputs(placed: unknown = originalPlaces()): ReturnType<typeof buildNativeAssemblyInputs> {
  return buildNativeAssemblyInputs(placed);
}
