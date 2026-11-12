# Forest trunks re-captured from the page (meta SERVER-PARITY SS10b)

- Online, players walked through Nalati's spruces. The room's tree
  colliders are capsule rows in `data/physicsRows.json`, a frozen capture
  of 155 trees; the page now plants 146 (engine `placeForest` over the
  product's forest rows), mostly on the same spots but at other heights.
  Engine's side-parity test named it: 113 page trunks with no server
  trunk.
- `scripts/forest-trunks.mjs` boots the page headless on a served engine
  build, reads `world.forest.trees` and rewrites the forest's capsule
  solids (engine `trunkCapsule`, f32) and `pieces[0].colliders`. All 146
  page trunks now match a server capsule; `--check` exits 1 when the rows
  drift again.
- `trees` and `tops` (the population habitat: herds and weather shelter)
  stay the 155-row capture: the format pins that file at exactly 155 rows
  (shardfile `populationEnvironment.ts`, G1004), so moving them is a
  format row, not this one.
- Not yet computed at build time: the page's planting needs the whole
  installed level (forest rows, mask lattice, baked ground), which the
  physics generator does not run.
