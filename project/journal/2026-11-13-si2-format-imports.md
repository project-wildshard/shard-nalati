# immutable and shardfile from shard-format (opus-si2b)

Meta SHARD-COMPAT SI2 (J319 I2). Engine's `host/immutable` and
`host/shardfile` only re-exported shard-format's code, so this shard now
imports it straight from `@wildshard/format/immutable` and
`@wildshard/format/shardSchema` (v0.4.6 carries SI1's `./immutable` and
`parseShardfileField`). Import lines only; no code changes.

- `pnpm build:shards` from HEAD and from the swap give the same bytes for
  every asset and section. Only the source stamps move: `map.tilesHash`
  (it hashes `generators/` bytes), `buildKey`, `sourceHash` and the hashes
  that cite them, in `map.json`, `shard.json` and `validation.json`. Two
  builds of the swap match each other exactly.
- Nothing is uploaded; the shard already waits on a re-upload since the
  v0.4.6 pin.
