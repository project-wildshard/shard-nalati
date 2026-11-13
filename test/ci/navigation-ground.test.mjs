// J186: build Nalati first. Check its actual admitted scalar/navigation bytes,
// not a copied discovery fixture or a renderer/world facade. Outside hooks.
import '@wildshard/engine/scripts/sim-node-loader.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const { loadHeadlessProduct } = await import('@wildshard/engine/host/headlessProduct');
const { outputDescriptor } = await import('@wildshard/engine/game/shardfile/outputDescriptor');
const { ScalarLatticeBindings } = await import('@wildshard/engine/world/scalarChannel');
const { parseNavmesh } = await import('@wildshard/engine/physics/navmesh');
const { navmeshGroundExclusion } = await import('@wildshard/sharddev/scripts/bake/navmeshGround.ts');
const { decodePortableBytes } = await import('@wildshard/sharddev/bake/portableBytes');
const { TERRAIN } = await import('../../src/generators/terrainRecipe.ts');
const { nalatiWetAt } = await import('../../src/generators/wetRecipe.ts');

test('Nalati ships its authored wet field and preserves dry trails in real navigation', { timeout: 9500 }, async () => {
  const directory = resolve('out/nalati-grasslands'), product = await loadHeadlessProduct(directory);
  const discovery = JSON.parse(readFileSync(resolve(directory, 'mounts/shardfiles/nalati-grasslands/discovery.json'), 'utf8'));
  const policy = discovery.rows.navmesh, wet = policy.ground.wet;
  const bytes = await product.file(wet.values.data.file), raw = decodePortableBytes(bytes);
  const expected = new Float32Array(wet.res * wet.res);
  for (let z = 0; z < wet.res; z++) for (let x = 0; x < wet.res; x++) {
    expected[z * wet.res + x] = Number(nalatiWetAt(-wet.size / 2 + x * wet.size / (wet.res - 1), -wet.size / 2 + z * wet.size / (wet.res - 1)));
  }
  assert.deepEqual(raw, new Uint8Array(expected.buffer), 'Every shipped wet value must come from Nalati authored geography');
  const scalars = new ScalarLatticeBindings(), exclude = navmeshGroundExclusion(policy, TERRAIN, scalars);
  scalars.prepare(new Map([[wet.values.data.file, bytes]]));
  assert.ok(exclude);
  const navigation = product.shardfile.navigation, descriptor = outputDescriptor(product.shardfile);
  assert.ok(navigation);
  const file = descriptor.index.files.find(row => row.hash === navigation.file);
  assert.ok(file);
  const nav = parseNavmesh(Uint8Array.from(readFileSync(resolve(directory, file.path))).buffer);
  assert.ok(nav); nav.datum = () => 0;
  const seen = { wet: 0, trail: 0, dry: 0, walkableTrail: 0 };
  const sample = scalars.lattice(wet);
  for (let x = -245; x <= 245; x += 5) for (let z = -245; z <= 245; z += 5) {
    const y = Math.max(TERRAIN.heightAt(x, z), TERRAIN.waterLevel() + .250001);
    const isWet = sample(x, z) > .5, onTrail = TERRAIN.trailDistance(x, z) <= 3.5;
    assert.equal(exclude(x, z, y), isWet && !onTrail, `Wet/trail policy at ${x},${z}`);
    assert.equal(exclude(x, z, TERRAIN.waterLevel() + .25), true, 'The water equality boundary is excluded even on trails');
    if (!isWet) seen.dry++;
    else if (!onTrail) seen.wet++;
    else {
      seen.trail++;
      if (nav.closestWalkable({x, y: TERRAIN.heightAt(x, z), z}, .3)) seen.walkableTrail++;
    }
  }
  for (const [kind, count] of Object.entries(seen)) assert.ok(count > 0, `Actual Nalati ${kind} coverage must be nonempty`);
  console.log(`Nalati navigation: ${JSON.stringify(seen)}; ${expected.length} exact authored wet values`);
});
