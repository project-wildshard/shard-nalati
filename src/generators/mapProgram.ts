import type { ProjectGenerationContext } from '@wildshard/sdk/projectGeneration';
import { rasterSceneMap } from '@wildshard/sdk/bake/groundMap';
import { nalatiMapFiles } from './mapAssembly.mjs';
import { nalatiTerrainScene } from './terrainSceneProgram';
import settings from '../data/map.json' with { type: 'json' };

/** Every committed input the map reads (the pure map producer's and the painter's models), as build inputs: public files
 *  by URL, the shard's own files by project path. */
export const NALATI_MAP_INPUTS: readonly string[] = [
  '/assets/nalati-grasslands/baked/terrain.bin', '/assets/nalati-grasslands/baked/crags.bin', '/assets/nalati-grasslands/models/balbal.glb',
  '/assets/nalati-grasslands/models/boulder-1.glb', '/assets/nalati-grasslands/models/boulder-1.phone.glb', '/assets/nalati-grasslands/models/boulder-2.glb',
  '/assets/nalati-grasslands/models/boulder-2.phone.glb', '/assets/nalati-grasslands/models/boulder-3.glb', '/assets/nalati-grasslands/models/boulder-3.phone.glb',
  '/assets/nalati-grasslands/models/cauldron.glb', '/assets/nalati-grasslands/models/chest.glb', '/assets/nalati-grasslands/models/eagle.glb',
  '/assets/nalati-grasslands/models/firewood.glb', '/assets/nalati-grasslands/models/horse-saddled.glb', '/assets/nalati-grasslands/models/horse-wild.far.glb',
  '/assets/nalati-grasslands/models/kokpar-rider.glb', '/assets/nalati-grasslands/models/kumis-churn.glb', '/assets/nalati-grasslands/models/saddle.glb',
  '/assets/nalati-grasslands/models/snow-lotus.glb', '/assets/nalati-grasslands/models/watchtower.glb',
  'data/campCatalogue.json', 'data/campMaterials.json', 'data/discovery.json', 'data/modelMetrics.json',
];
const SHARD = 'src/shards/nalati-grasslands/';

/** The map's RGBA lattice from an exact input bank: the map assembly and the native terrain draws, painted with the
 *  original ground palette (the retired nalati-data-map job's pixels). */
export async function nalatiMapPixels(inputs: ReadonlyMap<string, Uint8Array>): Promise<Uint8Array> {
  for (const name of NALATI_MAP_INPUTS) {
    if (!inputs.has(name)) throw new Error(`Undeclared Nalati map input ${name}`);
  }
  // the pure producers name repository paths; the bank holds build-input names
  const repo = (path: string): Uint8Array => {
    const name = path.startsWith('src/static/') ? path.slice('src/static'.length) : path.startsWith(SHARD) ? path.slice(SHARD.length) : path;
    const bytes = inputs.get(name);
    if (bytes === undefined) throw new Error(`Undeclared Nalati map input ${path}`);
    return bytes;
  };
  const files = await nalatiMapFiles(repo), terrain = nalatiTerrainScene(repo('src/static/assets/nalati-grasslands/baked/terrain.bin'));
  const sources = new Map<string, Uint8Array>(files);
  for (const blob of terrain) sources.set(`assets/world-terrain/${(blob.file.name ?? '').split('/').at(-1)?.replace('.glb', '') ?? ''}.generated.glb`, blob.bytes);
  const read = (file: string): Uint8Array => sources.get(file) ?? repo(`${SHARD}${file}`);
  const json = (file: string): unknown => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(read(file)));
  return (await rasterSceneMap(settings, { input: read, bytes: read, json, model: url => repo(`src/static${url}`) })).pixels;
}

/** GR6: the map lattice through the build cache (the source-owned map, published by the SDK as the shard file map). */
export async function nalatiMap(ctx: Pick<ProjectGenerationContext, 'cached'>): Promise<Uint8Array> {
  const files = await ctx.cached({ id: 'world-map', native: true, inputs: NALATI_MAP_INPUTS }, async inputs =>
    new Map([['map.rgba', await nalatiMapPixels(inputs)]]));
  const pixels = files.get('map.rgba');
  if (files.size !== 1 || pixels?.byteLength !== 1000 * 1000 * 4) throw new Error('Nalati map lattice cache inventory differs');
  return pixels;
}
