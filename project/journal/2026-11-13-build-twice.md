# Build the shards twice in CI (opus-sa40)

Meta SHARD-AUTHORING SA40 (J319): generators are arbitrary Node, so one
that reads the clock or `Math.random()` makes a product nobody can
rebuild. `pnpm check:build-twice` (`scripts/build-twice.mjs`) copies the
tracked tree twice under `tmp/`, builds each copy with `build:shards`, an
empty HOME and its own shardfile cache, and fails when any product's
`map.tilesHash` or any product file differs. CI runs it as the
`build-twice` job on push and pull request. `wildshard check` is
unchanged.

- The empty HOME matters: with the real `~/.cache/wildshard/gen`, a
  `Math.random()` seeded into a Nalati yurt passed, because run b got run
  a's generation back. With it, the same seed failed on 10 product files.
- `map.tilesHash` hashes the map's source inputs, so on its own it never
  sees a nondeterministic generator; the per-file compare does.
