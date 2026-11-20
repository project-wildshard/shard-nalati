import { MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { readRigDocument, writeRigDocument } from '@wildshard/sharddev/bake/rig';
import { skinnedGlb, type SkinnedBone } from '@wildshard/sharddev/bake/skinned';
import { Rng } from '@wildshard/sharddev/random';
import type { CreatureRig } from '@wildshard/sharddev/scene/creature';
import type { VariantDef } from '@wildshard/kit/bake/species';
import { buildBalbal } from './balbalBody';

export async function eagleRig(bytes: Uint8Array): Promise<{ rig: CreatureRig; atlas: Uint8Array }> {
  const document = await readRigDocument(bytes), root = document.getRoot();
  const [skin] = root.listSkins(), [mesh] = root.listMeshes();
  const primitive = mesh?.listPrimitives()[0], material = primitive?.getMaterial();
  const atlas = material?.getBaseColorTexture()?.getImage();
  if (skin === undefined || root.listSkins().length !== 1 || root.listMeshes().length !== 1
      || mesh?.listPrimitives().length !== 1 || material?.getDoubleSided() !== true
      || atlas === null || atlas === undefined) throw new Error('Expected Nalati’s original double-sided eagle with one atlas');
  const bones: SkinnedBone[] = skin.listJoints().map(joint => ({
    name: joint.getName(), parent: joint.getParentNode()?.getName() ?? null, pos: joint.getWorldTranslation(),
  }));
  // The skin binding owns the same atlas separately. Leave the joint order,
  // bind transforms, triangle indices, UVs and two-sided wing geometry intact.
  material.setBaseColorTexture(null);
  for (const texture of root.listTextures()) texture.dispose();
  for (const extension of root.listExtensionsUsed()) if (['KHR_texture_basisu', 'EXT_texture_webp'].includes(extension.extensionName)) extension.dispose();
  return { rig: { glb: await writeRigDocument(document), bones, clips: [], lamps: [] }, atlas };
}

export function balbalRig(variant: VariantDef): CreatureRig {
  const body = buildBalbal(variant, new Rng(1));
  const parts = [...body.furParts, ...body.hardParts, ...body.eyeParts];
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (geometry === null) throw new Error(`Incompatible Balbal body channels: ${variant.id}`);
  const material = new MeshStandardMaterial({ vertexColors: true });
  try {
    const { glb } = skinnedGlb({ name: `balbal.${variant.id}`, bones: body.bones, parts: [{ geometry, material }] });
    return { glb, bones: body.bones, clips: [], lamps: [] };
  } finally { geometry.dispose(); material.dispose(); }
}
