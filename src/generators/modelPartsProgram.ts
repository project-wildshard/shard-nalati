import type { ProjectGenerationContext } from '@wildshard/sdk/projectGeneration';
import { parseGlb, parseKtx2 } from '@wildshard/sdk/assets';
import { bakeRawColourPixels } from '@wildshard/sdk/bake/rawTexture';
import { MODEL_FILES, bakeModelPaint } from './modelPaint.mjs';
import { nalatiModelSourceParts } from './modelSourceParts';

const inputPrefix = '/assets/nalati/models/';
/** S4 on Nalati: a phone model's atlas is UASTC with its mip chain, half the raw RGBA's wire. S12f3: the build encodes it
 *  from the phone model's own paint with the host's checked Basis encoder, so no hand-made atlas sits in source.
 *  UASTC, not raw 6×6: a shard file blob has no image route, so a phone-tier GPU with no ASTC must still transcode it. */
const hasPhoneAtlas = (file: string): boolean => file.endsWith('.phone.glb');

/** Owned geometry/atlas cache from the defining painter; no public painted-model handoff. */
export async function nalatiModelPartsProgram(ctx: Pick<ProjectGenerationContext, 'cached' | 'readImagePixels' | 'encodeZstdBytes' | 'basisEncoder'>, selected: readonly string[] = MODEL_FILES): Promise<ReadonlyMap<string, Uint8Array>> {
  const names = [...selected];
  if (names.length === 0 || new Set(names).size !== names.length || names.some(file => !MODEL_FILES.includes(file))) throw new Error('Invalid Nalati model-part selection');
  const expected = names.flatMap(file => file.endsWith('.far.glb') ? [file] : [file, file.replace(/\.glb$/u, '.ktx2')]);
  const encoder = names.some(hasPhoneAtlas) ? await ctx.basisEncoder?.() : undefined;
  if (names.some(hasPhoneAtlas) && encoder === undefined) throw new Error('Nalati phone atlases need the checked Basis encoder');
  const id = encoder === undefined ? 'model-parts' : `model-parts-${encoder.identity}`;
  const files = await ctx.cached({ id, native: true, inputs: names.map(file => `${inputPrefix}${file}`) }, async inputs => {
    const out = new Map<string, Uint8Array>();
    for (const file of names) {
      const input = inputs.get(`${inputPrefix}${file}`), name = file.split('.')[0];
      if (input === undefined || name === undefined) throw new Error(`Missing authored Nalati model: ${file}`);
      const parts = nalatiModelSourceParts(await bakeModelPaint(input, name));
      out.set(file, parts.geometry);
      if (parts.webp === null) continue;
      const pixels = await ctx.readImagePixels(parts.webp);
      out.set(file.replace(/\.glb$/u, '.ktx2'), encoder !== undefined && hasPhoneAtlas(file)
        ? await encoder.encode({ index: 0, bytes: parts.webp, width: pixels.width, height: pixels.height })
        : bakeRawColourPixels(pixels, { colourSpace: 'srgb' }, ctx.encodeZstdBytes));
    }
    return out;
  });
  if (files.size !== expected.length || [...files.keys()].some(file => !expected.includes(file))) throw new Error('Nalati model-part inventory differs');
  for (const file of expected) {
    const bytes = files.get(file);
    if (bytes === undefined) throw new Error(`Missing Nalati model part: ${file}`);
    if (file.endsWith('.ktx2')) parseKtx2(bytes); else parseGlb(bytes);
  }
  return files;
}
