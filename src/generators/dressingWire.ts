import { encodeBuildBytes } from '@wildshard/sharddev/bake/byteCodec';
import { bakeDressing } from './dressingGeometryRows';
import { encodeNalatiPart } from './placeWire';

/** Construct the original native wire once for source and retained CLI readers, without publication. */
export function buildDressingWire(): ReturnType<typeof encodeNalatiPart> {
  return encodeNalatiPart(bakeDressing(), bytes => encodeBuildBytes(bytes, 'deflate', 9, 'native'));
}
