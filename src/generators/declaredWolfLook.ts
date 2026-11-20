import { SkinnedMesh } from 'three';
import { assetCost } from '@wildshard/sharddev/assets';
import { hullCreature, type HullCreature } from '@wildshard/sharddev/bake/hullLook';
import { bakeRawColourPixels } from '@wildshard/sharddev/bake/rawTexture';
import { readSourceModel } from '@wildshard/sharddev/bake/skinned';
import type { ProjectGenerationContext } from '@wildshard/sharddev/projectGeneration';
import { speciesProgramToRows } from '@wildshard/sharddev/species/toRows';
import { hashImmutableBytes } from '@wildshard/format/immutable';
import type { Shardfile } from '@wildshard/format/shardSchema';
import { parseSkinFile, skinFileDependencies } from '@wildshard/format/skinAssets';
import boot from '../data/headlessBoot.json' with { type: 'json' };
import { NALATI_ECOLOGY as ecology } from './ecology.mjs';
import { NALATI_HULL_BOOK } from './riggedHulls';
import { nalatiRigFile } from './rigSources';

type Asset = Shardfile['files'][number];
type Tier = 'phone' | 'desktop';
interface WolfLook {
  files: Asset[];
  library: string[];
  looks: Shardfile['rows']['looks'];
  species: Shardfile['rows']['species'];
}

function sourceBytes(inputs: ReadonlyMap<string, Uint8Array>, file: string): Uint8Array {
  const bytes = inputs.get(file);
  if (bytes === undefined) throw new Error(`Missing wolf look source: ${file}`);
  return bytes;
}

function wolfSpecies() {
  const recipe = boot.recipes.find(row => row.kind === 'wolf');
  if (recipe === undefined) throw new Error('Missing wolf recipe');
  const { bodyY, bodyHalfLen, bodyRadius, headRadius, legLen, halfWidth, feet } = recipe.dims;
  const wolf = { ...boot.species.wolf, ...ecology.gameplay.wolf, id: 'nalati.wolf', label: 'Steppe wolf', lockable: recipe.lockable ?? true };
  const original = { look: 'look.nalati.wolf', dims: { bodyY, bodyHalfLen, bodyRadius, headRadius, legLen, halfWidth, feet } };
  const { species: [species] } = speciesProgramToRows({ species: [wolf], strikes: [] }, new Map([['wolf', original]]));
  if (species === undefined) throw new Error('Missing wolf species row');
  return species;
}

function coatSource(variant: string, tier: Tier): string | undefined {
  const coats = NALATI_HULL_BOOK.tiers[tier].coats;
  return coats?.[`wolf:wolf:${variant}`]?.key;
}

async function wolfAtlas(rig: Uint8Array): Promise<Uint8Array> {
  const model = await readSourceModel(rig);
  const mesh = model.gltf.scene.getObjectsByProperty('isSkinnedMesh', true).find((node): node is SkinnedMesh => node instanceof SkinnedMesh);
  if (mesh === undefined || Array.isArray(mesh.material)) throw new Error('Expected one painted wolf hull');
  const base = model.texture(mesh.material);
  if (base === null) throw new Error('Missing wolf atlas');
  return base.image;
}

async function bakeTier(tier: Tier, ctx: Pick<ProjectGenerationContext, 'readImagePixels'>, inputs: ReadonlyMap<string, Uint8Array>,
  species: ReturnType<typeof wolfSpecies>): Promise<HullCreature> {
  const rig = sourceBytes(inputs, nalatiRigFile('wolf', tier));
  const colour = async (bytes: Uint8Array): Promise<Uint8Array> => bakeRawColourPixels(await ctx.readImagePixels(bytes));
  const base = await colour(await wolfAtlas(rig));
  const variants: Record<string, { coat: Uint8Array }> = {};
  for (const { id } of species.variants) {
    const source = coatSource(id, tier);
    if (source !== undefined) variants[id] = { coat: await colour(sourceBytes(inputs, source)) };
  }
  return hullCreature(species.id, rig, { species, size: 'medium', skeleton: 'quadruped',
    look: { maps: { base }, surface: { family: 'painterly', rim: 0.8, bands: 0.85 }, variants } });
}

const header = 'data/wolf-look.json';
async function bakeWolves(ctx: Pick<ProjectGenerationContext, 'readImagePixels'>, inputs: ReadonlyMap<string, Uint8Array>,
  species: ReturnType<typeof wolfSpecies>): Promise<ReadonlyMap<string, Uint8Array>> {
  const phone = await bakeTier('phone', ctx, inputs, species), desktop = await bakeTier('desktop', ctx, inputs, species);
  const files = new Map<string, Asset>(), assets = new Map<string, Uint8Array>();
  const store = (bytes: Uint8Array, kind: Asset['kind'], dependencies: string[] = []): string => {
    const hash = hashImmutableBytes(bytes);
    if (!files.has(hash)) {
      files.set(hash, { hash, kind, ...assetCost(kind, bytes), compressed: bytes.length, critical: false, dependencies });
      assets.set(`assets/${hash}`, bytes);
    }
    return hash;
  };
  const table = (tier: HullCreature): string => {
    if (tier.files === undefined) throw new Error('Wolf tier has no variant table');
    for (const bytes of tier.files.glbs) store(bytes, 'glb');
    for (const bytes of tier.files.textures) store(bytes, 'ktx2');
    const skins = tier.files.skins.map(bytes => {
      const { row, binding } = parseSkinFile(bytes);
      return store(bytes, 'json', skinFileDependencies(row, binding));
    });
    return store(tier.files.table, 'json', [...new Set(skins)].sort());
  };
  const desktopTable = table(desktop), phoneTable = table(phone), lookId = 'look.nalati.wolf';
  const look = { ...desktop.look, id: lookId, parameters: { ...desktop.look.parameters, phone: phoneTable } };
  if (desktop.species.body === undefined) throw new Error('Missing wolf rig contract');
  const rows: WolfLook = { files: [...files.values()], library: [hashImmutableBytes(desktop.skin), desktopTable, phoneTable],
    species: [{ ...desktop.species, body: { ...desktop.species.body, look: lookId } }], looks: [look] };
  assets.set(header, new TextEncoder().encode(JSON.stringify(rows)));
  return assets;
}

/** Cook both authored rigs and coats so each tier can fetch only its own variant table. */
export async function declaredWolfLook(ctx: Pick<ProjectGenerationContext, 'cached' | 'asset' | 'readImagePixels'>): Promise<WolfLook> {
  const species = wolfSpecies(), tiers: readonly Tier[] = ['phone', 'desktop'];
  const inputs: string[] = [];
  for (const tier of tiers) {
    inputs.push(nalatiRigFile('wolf', tier));
    for (const { id } of species.variants) {
      const coat = coatSource(id, tier);
      if (coat !== undefined) inputs.push(coat);
    }
  }
  const rows = await ctx.cached({ id: 'wolf-look', inputs: [...new Set(inputs)] }, assets => bakeWolves(ctx, assets, species));
  for (const [name, bytes] of rows) {
    if (name !== header && ctx.asset(bytes) !== name.slice(7)) throw new Error('Wolf skin bytes failed content addressing');
  }
  return JSON.parse(new TextDecoder().decode(sourceBytes(rows, header))) as WolfLook;
}

export type { WolfLook };
