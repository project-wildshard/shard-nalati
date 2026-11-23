import { installWorldRegistry } from '@wildshard/sdk/internal/engine/world/registry';
import { unshuffleLanes } from '@wildshard/sdk/internal/engine/core/byteCodec';
// oxlint-disable-next-line import/no-nodejs-modules -- Decode the exact original retained shape bank.
import { inflateSync } from 'node:zlib';
import { SHAPES, SHAPE_BYTES } from './nalatiShapes';
import { originalPlaceBinary } from './nalati-original-place-binary';

/** Fabric owns only the original loaded shape book and the registry it reads.
 * The original full-world fixture provided this same decoded lane bank. */
export async function installWorldFixture(): Promise<void> {
  installWorldRegistry();
  if (!SHAPES.ready) await SHAPES.load(new Map([...SHAPE_BYTES,
    ['/assets/nalati/baked/places.bin', unshuffleLanes(new Uint8Array(inflateSync(await originalPlaceBinary())))],
  ]));
}
