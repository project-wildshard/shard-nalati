# Each bake solid names its piece (SERVER-PARITY SS10b)

> Written by: Claude (opus-parity3), 2026-11-13

- The room built `src/data/physicsRows.json`'s 2,685 solids with no owner
  or material. They are a frozen capture of the page, made in its piece
  registry's order (`pieces`), so `scripts/solid-owners.mjs` walks that
  layout: the 4 outer walls (`edge`), `forest`'s 146 capsules, the grid's
  4 entry boxes (`platform.grid`, stone), then every piece in order. Two
  pieces differ from their count: the Kurgan entrance's 19 descriptions
  are 24 boxes (one `treads` row is 6), and the camp child is an actor
  the capture left out.
- Each row gets `ownerId: piece:<registry id>` and `material` (the piece's
  surface, or the page's own per-collider surface where engine's
  `test/side-parity.page.json` stands: the bridge deck's planks, the
  dungeon's stone and metal). 509 of its 526 page colliders agree with
  the layout; none names another piece.
- The reader stays `piece` provenance: rows keep `body` (the arena seal
  is found by it) and the room needs no owner policy, so no save step.
  Engine 0.1.18 tags the material only; engine's next release reads
  `ownerId` too.
- The habitat's `trees`/`tops` stay the 155-row capture until engine takes
  shard-format with `1e3108b` (any canopy count, one top per tree).
