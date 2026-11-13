# generator-imports paid to zero (opus-sa6)

Meta SHARD-AUTHORING SA6 (J170, J317). The ratchet was 31.

- The author lint now loads sharddev's `wildshard-sdk` plugin
  (`node_modules/@wildshard/sharddev/lint/sdk-plugin.mjs`, pin `efbdc25`).
  Its `generator-imports` allows the shard format, valibot and `node:*`:
  26 of the 31 hits were those and pass as they are.
- Four generators imported engine's live `ModelDef` (and `paramsOf`,
  `Placement`) only to type the catalogue records the places bake reads.
  They now use `generators/modelSource.ts`: `ModelSource` (id, defaults,
  variants and the never-called build marker) and the same `paramsOf`; the
  placement type is the SDK's `AuthorPlacement`.
- `output.ts` imported `public/assets/nalati/baked/recurve-pool.json`, outside
  the shard. `prepareOutput` now reads it as a declared build input
  (`ctx.cached`, step `recurve-bow-page`) and passes it down; the bytes it
  ships as `weapons/bow-page.json` are the same. The predecessor fixture
  reads the file itself.
- The ratchet entries are deleted and the rule is a plain error. The
  `generators/` edits change `tilesHash`, so the shard uploads with the
  one-revision-per-shard pass, not now.
