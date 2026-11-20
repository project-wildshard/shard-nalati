import type { Shardfile } from '@wildshard/format/shardSchema';
import rows from '../data/physicsRows.json' with { type: 'json' };

/** Complete source-owned native physics metadata; binary floor/collider loans remain separate. */
export type NalatiPhysicsRows = Omit<typeof rows, 'notice'> & { version: 1; profile: string; notice: string };

/** G350-NA: Nalati's physics data from authoring inputs only: the authored rows no recipe computes yet (the floor,
 * actors, herds, spruces and their tops, yurts, pieces, fixed solids, spawn / group / flock rows, Crags ledges, marmots and
 * grass). No world, model, registry, engine or runtime code runs. */
export function nalatiPhysics(): NalatiPhysicsRows {
  const { notice: _notice, ...physics } = structuredClone(rows);
  return { version: 1, profile: 'authored rows', notice: 'DO NOT EDIT: regenerate with generators/physics.ts (nalati-physics).', ...physics };
}

/** Original native buffers, copied by the standard shard file writer. */
export function nalatiPhysicsSources(): { name: string; kind: 'bin'; source: string; options: { decoded: number } }[] {
  const file = rows.ground.heights.file;
  const colliders = new Map<string, number>();
  for (const solid of rows.solids) {
    if (solid.vertices === undefined) continue;
    const range = solid.vertices;
    colliders.set(range.file, Math.max(colliders.get(range.file) ?? 0, range.byteOffset + range.byteLength));
  }
  return [{ name: file, kind: 'bin', source: file, options: { decoded: (rows.ground.rows + 1) * (rows.ground.cols + 1) * 4 } },
    ...Array.from(colliders, ([name, decoded]) => ({ name, kind: 'bin' as const, source: name, options: { decoded } }))];
}

/** Boot placements for species whose layered body is already in the catalogue. */
export function nalatiDeclaredBootSpawns(): Shardfile['creatures']['spawns'] {
  const at = new Map(rows.spawns.map(spawn => [spawn.id, spawn]));
  return rows.actors.flatMap(actor => {
    if (actor.kind !== 'wolf' && actor.kind !== 'horse') return [];
    const placement = at.get(actor.id), seed = actor.seed * 0x100000000;
    if (placement === undefined || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
      throw new Error(`Missing exact declared boot placement or seed for ${actor.id}`);
    }
    const [x, y, z] = placement.at;
    if (x === undefined || y === undefined || z === undefined) throw new Error(`Incomplete boot position for ${actor.id}`);
    return [{ id: actor.id, species: `nalati.${actor.kind}`, variant: actor.variant, at: [x, y, z], yaw: placement.yaw,
      scale: actor.scale, seed, brain: null, strike: null }];
  });
}
