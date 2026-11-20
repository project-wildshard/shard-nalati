import { SkinnedMesh } from 'three';
import { assetCost } from '@wildshard/sharddev/assets';
import { hullCreature, type HullCreature, type HullLook } from '@wildshard/sharddev/bake/hullLook';
import { authorFormatRows } from '@wildshard/sharddev/formatJsonSchema';
import { creatureSkin } from '@wildshard/sharddev/scene/creature';
import { bakeRawColourPixels } from '@wildshard/sharddev/bake/rawTexture';
import { readSourceModel } from '@wildshard/sharddev/bake/skinned';
import type { ProjectGenerationContext } from '@wildshard/sharddev/projectGeneration';
import { species as readSpecies } from '@wildshard/sharddev/species';
import { speciesProgramToRows } from '@wildshard/sharddev/species/toRows';
import { hashImmutableBytes } from '@wildshard/format/immutable';
import type { Shardfile } from '@wildshard/format/shardSchema';
import { parseSkinFile, skinFileDependencies } from '@wildshard/format/skinAssets';
import { balbalRig, eagleRig } from './customCreatureRig';
import { bodySpecies } from './speciesRows';
import type { BodyRows } from './bodyKey';
import bakedBodies from '../data/bodies.json' with { type: 'json' };
import boot from '../data/headlessBoot.json' with { type: 'json' };
import authoredLooks from '../data/speciesLooks.json' with { type: 'json' };
import { NALATI_ECOLOGY as ecology } from './ecology.mjs';
import { CREATURE_HULLS, NALATI_HULL_BOOK } from './riggedHulls';
import { nalatiRigFile } from './rigSources';

type Asset = Shardfile['files'][number];
type Tier = 'phone' | 'desktop';
type Quadruped = 'wolf' | 'horse';
type Custom = 'eagle' | 'balbal';
type Kind = Quadruped | Custom;
const isQuadruped = (kind: Kind): kind is Quadruped => kind === 'wolf' || kind === 'horse';
interface CreatureLookRows {
  files: Asset[];
  library: string[];
  looks: Shardfile['rows']['looks'];
  species: Shardfile['rows']['species'];
}

function sourceBytes(inputs: ReadonlyMap<string, Uint8Array>, file: string): Uint8Array {
  const bytes = inputs.get(file);
  if (bytes === undefined) throw new Error(`Missing creature look source: ${file}`);
  return bytes;
}

function creatureSpecies(kind: Kind) {
  const authored = authoredLooks.find(row => row.metadata.kind === kind);
  if (authored === undefined) throw new Error(`Missing painted creature look: ${kind}`);
  if (!isQuadruped(kind)) {
    const parsed = authorFormatRows('speciesBookRows.SpeciesLookBookSchema', { slug: 'nalati-grasslands', body: {}, rows: [authored] }).rows[0];
    const body = (bakedBodies as unknown as BodyRows).bodies.find(row => row.key.startsWith(`${kind}:`));
    if (parsed === undefined || body === undefined) throw new Error(`Missing authored body: ${kind}`);
    const speciesInput = { ...parsed.metadata, id: `nalati.${kind}` };
    const original = { look: authored.id, dims: body.dims };
    const { species: [species] } = speciesProgramToRows({ species: [speciesInput], strikes: [] }, new Map([[kind, original]]));
    if (species === undefined) throw new Error(`Missing creature species row: ${kind}`);
    return { species, lookId: authored.id, material: authored.material };
  }
  const recipe = boot.recipes.find(row => row.kind === kind);
  if (recipe === undefined) throw new Error(`Missing creature recipe: ${kind}`);
  const { bodyY, bodyHalfLen, bodyRadius, headRadius, legLen, halfWidth, feet } = recipe.dims;
  const creature = readSpecies({ ...boot.species[kind], ...ecology.gameplay[kind], id: `nalati.${kind}`, label: authored.metadata.label, lockable: recipe.lockable ?? true });
  const original = { look: authored.id, dims: { bodyY, bodyHalfLen, bodyRadius, headRadius, legLen, halfWidth, feet } };
  const { species: [species] } = speciesProgramToRows({ species: [creature], strikes: [] }, new Map([[kind, original]]));
  if (species === undefined) throw new Error(`Missing creature species row: ${kind}`);
  return { species, lookId: authored.id, material: authored.material };
}

const hulls: Readonly<Record<string, string>> = CREATURE_HULLS;
type Recipe = ReturnType<typeof creatureSpecies>;
type BakedTier = Pick<HullCreature, 'skin' | 'species' | 'look' | 'files'>;
function hullOf(kind: Quadruped, variant: string): string {
  const hull = hulls[`${kind}:${variant}`];
  if (hull === undefined) throw new Error(`Missing creature hull: ${kind}:${variant}`);
  return hull;
}
function coatSource(kind: Quadruped, hull: string, variant: string, tier: Tier): string | undefined {
  const coats = NALATI_HULL_BOOK.tiers[tier].coats;
  return coats?.[`${hull}:${kind}:${variant}`]?.key;
}

async function hullAtlas(rig: Uint8Array): Promise<Uint8Array> {
  const model = await readSourceModel(rig);
  const mesh = model.gltf.scene.getObjectsByProperty('isSkinnedMesh', true).find((node): node is SkinnedMesh => node instanceof SkinnedMesh);
  if (mesh === undefined || Array.isArray(mesh.material)) throw new Error('Expected one painted creature hull');
  const base = model.texture(mesh.material);
  if (base === null) throw new Error('Missing creature atlas');
  return base.image;
}

async function bakeQuadrupedTier(kind: Quadruped, tier: Tier, ctx: Pick<ProjectGenerationContext, 'readImagePixels'>, inputs: ReadonlyMap<string, Uint8Array>,
  { species, material }: Recipe): Promise<HullCreature> {
  const colour = async (bytes: Uint8Array): Promise<Uint8Array> => bakeRawColourPixels(await ctx.readImagePixels(bytes));
  const authored = new Map<string, { rig: Uint8Array; maps: HullLook['maps'] }>();
  const variants: Record<string, NonNullable<HullLook['variants']>[string]> = {};
  let first: { rig: Uint8Array; maps: HullLook['maps'] } | undefined;
  for (const { id } of species.variants) {
    const hull = hullOf(kind, id);
    let known = authored.get(hull);
    if (known === undefined) {
      const rig = sourceBytes(inputs, nalatiRigFile(hull, tier));
      known = { rig, maps: { base: await colour(await hullAtlas(rig)) } };
      authored.set(hull, known);
    }
    first ??= known;
    const source = coatSource(kind, hull, id, tier);
    variants[id] = { ...known, ...(source === undefined ? {} : { coat: await colour(sourceBytes(inputs, source)) }) };
  }
  if (first === undefined) throw new Error(`Missing declared variants: ${kind}`);
  return hullCreature(species.id, first.rig, { species, size: kind === 'horse' ? 'large' : 'medium', skeleton: 'quadruped',
    look: { maps: first.maps, surface: { family: 'painterly', rim: material.rim, bands: material.bands }, variants } });
}

const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

async function bakeCustomTier(kind: Custom, tier: Tier, ctx: Pick<ProjectGenerationContext, 'readImagePixels'>,
  inputs: ReadonlyMap<string, Uint8Array>, { species, material }: Recipe): Promise<BakedTier> {
  const eagle = kind === 'eagle' ? await eagleRig(sourceBytes(inputs, nalatiRigFile(kind, tier))) : undefined;
  const colour = eagle === undefined ? undefined : await bakeRawColourPixels(await ctx.readImagePixels(eagle.atlas));
  const variants = bodySpecies(kind).variants.map(variant => {
    const rig = eagle?.rig ?? balbalRig(variant);
    const surface = { family: 'painterly' as const, rim: material.rim, bands: material.bands, vertexColours: colour === undefined,
      ...(colour === undefined ? {} : { map: hashImmutableBytes(colour), doubleSided: true }) };
    const skin = creatureSkin(rig, { id: species.id, family: 'pbr', binding: { loops: [], material: surface } });
    return { id: variant.id, rig, skin: encode(skin) };
  });
  const first = variants[0];
  if (first === undefined) throw new Error(`Missing declared variants: ${kind}`);
  const table = encode({ version: 1, skins: Object.fromEntries(variants.map(row => [row.id, hashImmutableBytes(row.skin)])) });
  const id = `${species.id}.look`;
  return { species, skin: first.skin,
    look: { id, species: species.id, recipe: 'platform.skin', material: null,
      parameters: { skin: hashImmutableBytes(first.skin), variants: hashImmutableBytes(table) },
      animation: { recipe: 'platform.clips', parameters: { attackSpan: 1 } } },
    files: { table, glbs: variants.map(row => row.rig.glb), textures: colour === undefined ? [] : [colour], skins: variants.map(row => row.skin) } };
}

const header = 'data/creature-look.json';
async function bakeCreature(kind: Kind, ctx: Pick<ProjectGenerationContext, 'readImagePixels'>, inputs: ReadonlyMap<string, Uint8Array>,
  recipe: Recipe): Promise<ReadonlyMap<string, Uint8Array>> {
  const bake = (tier: Tier) => isQuadruped(kind) ? bakeQuadrupedTier(kind, tier, ctx, inputs, recipe) : bakeCustomTier(kind, tier, ctx, inputs, recipe);
  const phone = await bake('phone'), desktop = kind === 'balbal' ? phone : await bake('desktop');
  const files = new Map<string, Asset>(), assets = new Map<string, Uint8Array>();
  const store = (bytes: Uint8Array, assetKind: Asset['kind'], dependencies: string[] = []): string => {
    const hash = hashImmutableBytes(bytes);
    if (!files.has(hash)) {
      files.set(hash, { hash, kind: assetKind, ...assetCost(assetKind, bytes), compressed: bytes.length, critical: false, dependencies });
      assets.set(`assets/${hash}`, bytes);
    }
    return hash;
  };
  const table = (tier: BakedTier): string => {
    if (tier.files === undefined) throw new Error(`Creature tier has no variant table: ${kind}`);
    for (const bytes of tier.files.glbs) store(bytes, 'glb');
    for (const bytes of tier.files.textures) store(bytes, 'ktx2');
    const skins = tier.files.skins.map(bytes => {
      const { row, binding } = parseSkinFile(bytes);
      return store(bytes, 'json', skinFileDependencies(row, binding));
    });
    return store(tier.files.table, 'json', [...new Set(skins)].sort());
  };
  const desktopTable = table(desktop), phoneTable = table(phone), { lookId } = recipe;
  const look = { ...desktop.look, id: lookId, parameters: { ...desktop.look.parameters, phone: phoneTable } };
  if (desktop.species.body === undefined) throw new Error(`Missing creature rig contract: ${kind}`);
  const rows: CreatureLookRows = { files: [...files.values()], library: [hashImmutableBytes(desktop.skin), desktopTable, phoneTable],
    species: [{ ...desktop.species, body: { ...desktop.species.body, look: lookId } }], looks: [look] };
  assets.set(header, new TextEncoder().encode(JSON.stringify(rows)));
  return assets;
}

/** Cook both authored rigs and coats so each tier can fetch only its own variant table. */
async function declaredLook(kind: Kind, ctx: Pick<ProjectGenerationContext, 'cached' | 'asset' | 'readImagePixels'>): Promise<CreatureLookRows> {
  const recipe = creatureSpecies(kind), tiers: readonly Tier[] = ['phone', 'desktop'];
  const inputs: string[] = [];
  for (const tier of tiers) {
    if (kind === 'eagle') inputs.push(nalatiRigFile(kind, tier));
    if (!isQuadruped(kind)) continue;
    for (const { id } of recipe.species.variants) {
      const hull = hullOf(kind, id);
      inputs.push(nalatiRigFile(hull, tier));
      const coat = coatSource(kind, hull, id, tier);
      if (coat !== undefined) inputs.push(coat);
    }
  }
  const rows = await ctx.cached({ id: `${kind}-${isQuadruped(kind) ? 'look' : 'custom-skin'}`, inputs: [...new Set(inputs)] }, assets => bakeCreature(kind, ctx, assets, recipe));
  for (const [name, bytes] of rows) {
    if (name !== header && ctx.asset(bytes) !== name.slice(7)) throw new Error(`Creature skin bytes failed content addressing: ${kind}`);
  }
  return JSON.parse(new TextDecoder().decode(sourceBytes(rows, header))) as CreatureLookRows;
}

export async function declaredCreatureLooks(ctx: Pick<ProjectGenerationContext, 'cached' | 'asset' | 'readImagePixels'>): Promise<CreatureLookRows> {
  const wolf = await declaredLook('wolf', ctx), horse = await declaredLook('horse', ctx);
  const ride = ecology.modes.ride.find((row: { readonly id: string }) => row.id === 'ride');
  if (ride === undefined) throw new Error('Missing authored horse gaits');
  for (const row of horse.species) row.mount = { gaits: ride.gaits };
  const looks = [wolf, horse, await declaredLook('eagle', ctx), await declaredLook('balbal', ctx)];
  const files = new Map(looks.flatMap(row => row.files).map(file => [file.hash, file]));
  return { files: [...files.values()], library: [...new Set(looks.flatMap(row => row.library))],
    looks: looks.flatMap(row => row.looks), species: looks.flatMap(row => row.species) };
}

export type { CreatureLookRows };
