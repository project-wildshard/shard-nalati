// The built look must lend the original geometry and skeleton on each tier.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { zstdDecompressSync } from 'node:zlib';
import { join } from 'node:path';
import { loadHeadlessFolder } from '@wildshard/engine/host/headlessFolder';
import { outputDescriptor } from '@wildshard/engine/game/shardfile/outputDescriptor';
import { entryFileSteps } from '@wildshard/format/tierSelection';
import { readRigDocument } from '@wildshard/sharddev/bake/rig';
import { bodySpecies } from '../../src/generators/speciesRows.ts';
import { buildBalbal } from '../../src/generators/balbalBody.ts';
import { Rng } from '@wildshard/sharddev/random';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const { resolveSkinLookTier } = await import('@wildshard/format/skinAssets');
const { readImagePixels } = await import('@wildshard/sharddev/bake/image');

// The GLB reader returns views over interleaved, packed, or plain buffers.
const equalChannel = (actual, expected, label) => {
  const a = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
  const b = Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength);
  assert.equal(a.compare(b), 0, label);
};
const primitive = root => root.listMeshes()[0].listPrimitives()[0];

test('cooked eagle and balbal looks preserve the authored wings, stone and joints', async () => {
  const folder = 'out/nalati-grasslands';
  const product = await loadHeadlessFolder(folder), source = product.shardfile;
  const descriptor = outputDescriptor(source);
  assert.ok(descriptor);
  const index = new Map(descriptor.index.files.map(file => [file.hash, file]));
  const files = new Map();
  // Read only the dependency closure of the 2 looks.
  const visit = hash => {
    if (files.has(hash)) return;
    const file = index.get(hash);
    assert.ok(file, hash);
    files.set(hash, readFileSync(join(folder, file.path)));
    for (const key of file.dependencies) visit(key);
  };
  const looks = source.rows.looks.filter(row => ['look.nalati.eagle', 'look.nalati.balbal'].includes(row.id));
  assert.equal(looks.length, 2);
  // Format 0.63: a tiered look names `phone` (its phone skin) and `phoneVariants`; the one-tier balbal names neither.
  for (const look of looks) for (const name of ['skin', 'variants', 'phone', 'phoneVariants']) if (look.parameters[name] !== undefined) visit(look.parameters[name]);
  const balbal = bodySpecies('balbal').variants;
  const byTier = {};
  for (const tier of ['phone', 'desktop']) {
    const selected = entryFileSteps(source, tier, descriptor);
    let step = selected.next();
    while (!step.done) step = selected.next();
    const entries = {};
    for (const look of looks) {
      const { variants } = resolveSkinLookTier(source, look, { assets: files, tier });
      const kind = look.id.endsWith('.eagle') ? 'eagle' : 'balbal';
      assert.deepEqual([...variants.keys()].sort(), kind === 'eagle' ? ['qyran'] : ['capped', 'warrior']);
      for (const [id, { row, binding }] of variants) {
        assert.ok(!step.value.has(row.file), `${tier} owns ${id}`);
        const root = (await readRigDocument(files.get(row.file))).getRoot();
        const geometry = primitive(root);
        const joints = root.listSkins()[0].listJoints().map(node => node.getName());
        assert.deepEqual(joints, row.rig.joints[0]);
        entries[id] = { file: row.file, triangles: geometry.getIndices().getCount() / 3, joints: joints.length };
        if (kind === 'eagle') {
          const suffix = tier === 'phone' ? '.phone' : '';
          const original = (await readRigDocument(readFileSync(`public/assets/nalati/models/eagle${suffix}.rigged.glb`))).getRoot();
          const authored = primitive(original);
          for (const channel of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']) {
            equalChannel(geometry.getAttribute(channel).getArray(), authored.getAttribute(channel).getArray(), `${tier} eagle ${channel}`);
          }
          equalChannel(geometry.getIndices().getArray(), authored.getIndices().getArray(), 'Eagle triangles');
          assert.deepEqual(joints, original.listSkins()[0].listJoints().map(node => node.getName()));
          assert.equal(geometry.getMaterial().getDoubleSided(), true);
          assert.equal(binding.material.doubleSided, true);
          const atlas = files.get(binding.material.map);
          const offset = Number(atlas.readBigUInt64LE(80)), bytes = Number(atlas.readBigUInt64LE(88));
          const sourceAtlas = await readImagePixels(authored.getMaterial().getBaseColorTexture().getImage());
          assert.equal(atlas.readUInt32LE(20), sourceAtlas.width);
          assert.equal(atlas.readUInt32LE(24), sourceAtlas.height);
          equalChannel(zstdDecompressSync(atlas.subarray(offset, offset + bytes)), sourceAtlas.pixels, 'Eagle atlas pixels');
        } else {
          assert.equal(binding.material.vertexColours, true);
          const body = buildBalbal(balbal.find(variant => variant.id === id), new Rng(1));
          const parts = [...body.furParts, ...body.hardParts, ...body.eyeParts];
          const original = mergeGeometries(parts, false);
          try {
            for (const [channel, name] of [['POSITION', 'position'], ['NORMAL', 'normal'], ['COLOR_0', 'color'], ['JOINTS_0', 'skinIndex'], ['WEIGHTS_0', 'skinWeight']]) {
              equalChannel(geometry.getAttribute(channel).getArray(), original.getAttribute(name).array, `${id} ${channel}`);
            }
            assert.deepEqual([...geometry.getIndices().getArray()], [...original.index.array], `${id} triangles`);
            assert.deepEqual(joints, body.bones.map(bone => bone.name));
          } finally { original.dispose(); for (const part of parts) part.dispose(); }
        }
      }
    }
    byTier[tier] = entries;
  }
  assert.notEqual(byTier.phone.qyran.file, byTier.desktop.qyran.file);
  assert.deepEqual(byTier.phone.warrior, byTier.desktop.warrior);
  assert.deepEqual(byTier.phone.capped, byTier.desktop.capped);
  console.log(JSON.stringify(byTier));
});
