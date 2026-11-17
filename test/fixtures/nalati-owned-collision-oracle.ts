// oxlint-disable-next-line import/no-nodejs-modules -- Independent retained owner capture, never a product/installer readout.
import { readFileSync } from 'node:fs';
// oxlint-disable-next-line import/no-nodejs-modules -- Fence the complete independent physics capture before interpreting it.
import { createHash } from 'node:crypto';
import * as v from 'valibot';

/** shard-nalati src/data/physicsRows.json at eb64606172a30293a17876ae82e4f531b449d69b.
 * J352's grid owns the edge walls; the native resident must retain all other declared solids. */
export function ownedCollisionFloor(): number {
  const bytes = readFileSync('test/fixtures/nalati-physics-owned-capture.json');
  if (bytes.byteLength !== 927527 || createHash('sha256').update(bytes).digest('hex') !== '0d12eb488b74af64c6cc56356c3511e244d53d8a152df0d3e6663df789199f85')
    throw new Error('Independent owned physics capture differs');
  const rows = v.parse(v.object({ solids: v.array(v.object({ material: v.string() })) }), JSON.parse(bytes.toString('utf8')));
  const edges = rows.solids.filter(row => row.material === 'edge');
  if (rows.solids.length !== 2685 || edges.length !== 4) throw new Error('Independent owned collider inventory differs');
  return rows.solids.length - edges.length;
}
