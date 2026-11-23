import { withPortableMath } from '@wildshard/sdk/math/portableMath';
import { hashImmutableBytes } from '@wildshard/engine/host/immutable';
import { Rng } from '@wildshard/sdk/random';
import { graniteBlock } from '../../src/generators/granite';
import { blob } from '../../src/generators/smoothGeometry';

/** Full original generated geometry channels and stream continuation on portable Math. */
export function geometryCacheAuthorObservation() {
  return withPortableMath(() => {
    const first = new Rng(7), second = Rng.scrambled(19);
    const models = [{ name: 'granite-small', geometry: graniteBlock(1.2, 0.8, 0.7, 17) },
      { name: 'granite-large', geometry: graniteBlock(6, 4, 3, 29, 0.2, 5) },
      { name: 'blob', geometry: blob(1.4, first, 1, 0.75, 0.22) },
      { name: 'scrambled-blob', geometry: blob(2, second, 2, 0.5, 0.17) }];
    try { return models.map(({ name, geometry }) => {
      const index = geometry.getIndex();
      const attributes = [...Object.entries(geometry.attributes), ...(index === null ? [] : [['index', index] as const])];
      return { name, channels: attributes.map(([channel, value]) => ({ channel, storage: value.array.constructor.name,
        width: value.itemSize, normalized: value.normalized, bytes: value.array.byteLength,
        hash: hashImmutableBytes(new Uint8Array(value.array.buffer, value.array.byteOffset, value.array.byteLength)) })),
        groups: geometry.groups, stream: name === 'blob' ? first.snapshot() : name === 'scrambled-blob' ? second.snapshot() : null };
    }); } finally { for (const model of models) model.geometry.dispose(); }
  });
}
