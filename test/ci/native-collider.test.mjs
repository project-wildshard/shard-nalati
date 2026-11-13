// Actual owner bytes and public installed admission; explicit CI only.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as v from 'valibot';
import { NativeArraySliceSchema, nativeColliderRecordSchema } from '@wildshard/format/nativePhysics';
import { WorldPhysicsSchema } from '@wildshard/format/worldPhysics';
import { createNativeBakeReader } from '@wildshard/engine/game/population/nativeBake';
import { readNamedBlob } from '@wildshard/sharddev/blobs';
import { originalNalatiPhysics } from '../fixtures/nalati-physics-original.ts';
import { nalatiPhysicsSources } from '../../src/shards/nalati-grasslands/generators/physics.ts';

const options = { label: 'Orchard', resolution: 2, size: 4, parked: false, rig: 'segments', provenance: 'piece', shapes: [1, 2, 6, 9] };
const file = 'data/colliders.bin';
const points = Float32Array.from([-0, 1.25, -2, 3, 4, 5, 6, 7, 8]);
const indices = Uint32Array.from([0, 1, 2]);
const transport = new Uint8Array(12 + points.byteLength + indices.byteLength);
transport.set(new Uint8Array(points.buffer), 12);
transport.set(new Uint8Array(indices.buffer), 12 + points.byteLength);
const solid = { shape: 6, body: 0, groups: 1, friction: .9, at: [1, 2, 3], rot: [0, 0, 0, 1],
  vertices: { file, byteOffset: 12, byteLength: points.byteLength },
  indices: { file, byteOffset: 12 + points.byteLength, byteLength: indices.byteLength } };
const ground = { rows: 1, cols: 1, friction: .9, groups: 1, scale: { x: 4, y: 1, z: 4 }, at: { x: 0, y: 0, z: 0 }, heights: { file: 'data/floor.bin' } };
const floor = { file: ground.heights.file, bytes: new Uint8Array(16) };
const input = { version: 1, ground, solids: [solid], actors: [], herds: [] };

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function timed(name, run) {
  test(name, { timeout: 9500 }, async () => {
    const started = performance.now();
    await run();
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 9500, `Collider proof used ${elapsed} ms; cap is 9500 ms`);
  });
}

timed('raw collider ranges remain opt-in, aligned, strict and admitted by world physics', () => {
  assert.throws(() => v.parse(nativeColliderRecordSchema([6], 'piece'), solid));
  assert.deepEqual(v.parse(nativeColliderRecordSchema([6], 'piece', true), solid), solid);
  assert.deepEqual(v.parse(WorldPhysicsSchema, { ...input, rig: 'segments', provenance: 'piece' }).solids, [solid]);
  for (const changed of [{ file: '../hull.bin' }, { file: '/hull.bin' }, { file: 'hull.json' }, { byteOffset: -4 },
    { byteOffset: 2 }, { byteLength: 3 }, { byteLength: Number.NaN }, { byteOffset: 2_147_483_648 }, { extra: true }]) {
    assert.throws(() => v.parse(NativeArraySliceSchema, { ...solid.vertices, ...changed }));
  }
  // sharddev's package no longer ships scripts/docs (fd986e8), so read the
  // byteOffset pipe itself for its declared 4-byte alignment.
  assert.ok(NativeArraySliceSchema.entries.byteOffset.pipe.some(part => part.type === 'multiple_of' && part.requirement === 4));
});

timed('the reader owns exact f32 and u32 copies and publishes only its complete bake', () => {
  const borrowed = Uint8Array.from(transport);
  const reader = createNativeBakeReader(input, options, floor, [{ file, bytes: borrowed }]);
  const bake = reader.read(), actual = bake.solids[0];
  assert.ok(actual?.points !== undefined && actual.indices !== undefined);
  assert.deepEqual(actual.points, points);
  assert.ok(Object.is(actual.points[0], -0));
  assert.deepEqual(actual.indices, indices);
  assert.notEqual(actual.points.buffer, borrowed.buffer);
  assert.notEqual(actual.indices.buffer, actual.points.buffer);
  assert.equal(reader.read(), bake);
  borrowed.fill(0);
  assert.deepEqual(actual.points, points);
  assert.deepEqual(actual.indices, indices);
  assert.notEqual(reader.solid({ ...solid, vertices: solid.vertices }), actual);
});

timed('missing, duplicate and invalid blocks refuse without preventing a later valid intake', () => {
  assert.throws(() => createNativeBakeReader(input, options, floor).read(), /Missing native collider block/u);
  assert.throws(() => createNativeBakeReader(input, options, floor, [{ file, bytes: transport }, { file, bytes: transport }]), /duplicate/u);
  const leading = { ...solid, at: [4, 5, 6] };
  const mutable = { ...input, solids: [leading, { ...solid, vertices: { ...solid.vertices, byteOffset: transport.byteLength } }] };
  const reader = createNativeBakeReader(mutable, options, floor, [{ file, bytes: transport }]);
  assert.throws(() => reader.read(), /range exceeds/u);
  assert.throws(() => reader.read(), /range exceeds/u);
  mutable.solids[1] = solid;
  const recovered = reader.read();
  assert.equal(recovered.solids.length, 2);
  assert.deepEqual(recovered.solids.map(row => row.points), [points, points]);
  assert.deepEqual(recovered.solids.map(row => row.indices), [indices, indices]);
  const control = createNativeBakeReader({ ...input, solids: [leading, solid] }, options, floor, [{ file, bytes: transport }]).read();
  assert.deepEqual(recovered, control);
  assert.equal(reader.read(), recovered);
  assert.throws(() => reader.solid({ ...solid, vertices: { ...solid.vertices, byteOffset: 2 } }));
});

function assertRange(actual, range, blocks, Type) {
  if (range === undefined) { assert.equal(actual, undefined); return; }
  assert.equal(typeof range, 'object');
  const block = blocks.get(range.file);
  assert.ok(block !== undefined);
  const expected = Uint8Array.from(block.subarray(range.byteOffset, range.byteOffset + range.byteLength));
  assert.ok(actual instanceof Type);
  assert.deepEqual(new Uint8Array(actual.buffer, actual.byteOffset, actual.byteLength), expected);
  assert.notEqual(actual.buffer, block.buffer);
}

timed('every original Nalati hull comes from the actual shipped blocks in order', () => {
  const directory = 'src/shards/nalati-grasslands/data/';
  const first = readFileSync(directory + 'physics-colliders-0.bin');
  const second = readFileSync(directory + 'physics-colliders-1.bin');
  const blocks = [{ file: 'data/physics-colliders-0.bin', bytes: first }, { file: 'data/physics-colliders-1.bin', bytes: second }];
  const source = originalNalatiPhysics();
  const bake = createNativeBakeReader(source, { ...options, label: 'Nalati', resolution: 256, size: 500 },
    { file: 'data/physics-ground.bin', bytes: readFileSync(directory + 'physics-ground.bin') }, blocks).read();
  const joined = new Uint8Array(first.length + second.length);
  const byFile = new Map(blocks.map(row => [row.file, row.bytes]));
  assert.equal(bake.solids.length, source.solids.length);
  let offset = 0, count = 0;
  for (const [index, row] of bake.solids.entries()) {
    const original = source.solids[index];
    assert.ok(original !== undefined);
    const { vertices, indices: originalIndices, body: _body, ...metadata } = original;
    const { points: _points, indices: _indices, ...actualMetadata } = row;
    assert.deepEqual(actualMetadata, metadata);
    assertRange(row.points, vertices, byFile, Float32Array);
    assertRange(row.indices, originalIndices, byFile, Uint32Array);
    if (row.points === undefined) continue;
    const bytes = new Uint8Array(row.points.buffer, row.points.byteOffset, row.points.byteLength);
    joined.set(bytes, offset); offset += bytes.length; count++;
  }
  assert.ok(count > 0);
  assert.equal(count, source.solids.filter(row => row.vertices !== undefined).length);
  assert.equal(offset, joined.length);
  assert.deepEqual(joined, Uint8Array.from([...first, ...second]));
});

timed('both original hull files survive standard named binary admission', async () => {
  const sources = nalatiPhysicsSources().filter(row => row.name !== 'data/physics-ground.bin');
  assert.deepEqual(sources.map(row => row.name), ['data/physics-colliders-0.bin', 'data/physics-colliders-1.bin']);
  const hashes = [];
  for (const source of sources) {
    const blob = await readNamedBlob('src/shards/nalati-grasslands', source.name, source.source, source.kind, source.options);
    assert.equal(blob.file.decoded, blob.bytes.length);
    const digest = hash(blob.bytes);
    assert.equal(blob.file.name, source.name);
    assert.equal(blob.file.kind, source.kind);
    assert.equal(blob.file.hash, digest);
    assert.equal(blob.file.path, `blobs/bin/${digest}.bin`);
    assert.equal(blob.file.compressed, blob.bytes.length);
    hashes.push(digest);
  }
  assert.deepEqual(hashes, ['238c9e25120ab8e89ddf3f8c20434e9a808b7bc19cb2a928011ca3f90ade34f1',
    'a98661800d44e6dfb62b81ecdb310eeebe09837f373bf260dfcae5da07c72d95']);
});
