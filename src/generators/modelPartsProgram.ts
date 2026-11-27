import type { ProjectGenerationContext } from '@wildshard/sdk/projectGeneration';
import { parseGlb } from '@wildshard/sdk/assets';
import { MODEL_FILES, bakeModelPaint } from './modelPaint.mjs';
import { nalatiModelSourceParts } from './modelSourceParts';

const inputPrefix = '/assets/nalati-grasslands/models/';
/** SF6 (J525): a model's atlas is a PNG of its own paint, desktop and phone alike; the cook makes its KTX2 (UASTC with
 *  its mip chain), so the build needs no Basis encoder. */
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const isPng = (bytes: Uint8Array): boolean => PNG.every((byte, at) => bytes[at] === byte);

/** Owned geometry/atlas cache from the defining painter; no public painted-model handoff. */
export async function nalatiModelPartsProgram(ctx: Pick<ProjectGenerationContext, 'cached' | 'readImagePixels' | 'writeImagePixels'>, selected: readonly string[] = MODEL_FILES): Promise<ReadonlyMap<string, Uint8Array>> {
  const names = [...selected];
  if (names.length === 0 || new Set(names).size !== names.length || names.some(file => !MODEL_FILES.includes(file))) throw new Error('Invalid Nalati model-part selection');
  const expected = names.flatMap(file => file.endsWith('.far.glb') ? [file] : [file, file.replace(/\.glb$/u, '.png')]);
  const write = ctx.writeImagePixels;
  if (write === undefined) throw new Error('Nalati model atlases need the host PNG writer');
  const id = 'model-parts-png';
  const files = await ctx.cached({ id, native: true, inputs: names.map(file => `${inputPrefix}${file}`) }, async inputs => {
    const out = new Map<string, Uint8Array>();
    for (const file of names) {
      const input = inputs.get(`${inputPrefix}${file}`), name = file.split('.')[0];
      if (input === undefined || name === undefined) throw new Error(`Missing authored Nalati model: ${file}`);
      const parts = nalatiModelSourceParts(await bakeModelPaint(input, name));
      out.set(file, parts.geometry);
      if (parts.webp === null) continue;
      out.set(file.replace(/\.glb$/u, '.png'), await write(await ctx.readImagePixels(parts.webp)));
    }
    return out;
  });
  if (files.size !== expected.length || [...files.keys()].some(file => !expected.includes(file))) throw new Error('Nalati model-part inventory differs');
  for (const file of expected) {
    const bytes = files.get(file);
    if (bytes === undefined) throw new Error(`Missing Nalati model part: ${file}`);
    if (file.endsWith('.png')) { if (!isPng(bytes)) throw new Error(`Nalati model atlas is not a PNG: ${file}`); } else parseGlb(bytes);
  }
  return files;
}
