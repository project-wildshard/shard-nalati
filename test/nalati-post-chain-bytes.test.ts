import { hashImmutableBytes } from '@wildshard/engine/host/immutable';
import { expect, test } from 'vitest';
import { postChainRows } from '../src/shards/nalati-grasslands/generators/postChain';

test('the relocated Nalati post declaration retains the original bytes', () => {
  const bytes = new TextEncoder().encode(JSON.stringify(postChainRows()));
  expect({ bytes: bytes.length, hash: hashImmutableBytes(bytes) }).toEqual({
    bytes: 9953, hash: '2a4758ffa4e3cf2a8b29516c5980cbaff828f1d8b735f588d760b2e44058bdd1',
  });
});
