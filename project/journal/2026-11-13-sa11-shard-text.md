# SA11: Nalati shard text

> Written by: Claude

J317 retires `product` from author-facing names (meta
SHARD-AUTHORING SA11, same conventions as shard-pine-hollow `7e6e505`).
`generators/product.ts` is now `generators/shardfile.ts` with
`nalatiShardfileRows`; `modelBindings.ts`'s prefix is `paintedPrefix`;
the fixtures `nalati-product-inputs.ts` / `nalati-product-source.ts`
are `nalati-shardfile-inputs.ts` / `nalati-shardfile-source.ts`
(`originalNalatiShardfileRows`). Comments, error text, CI journey
headers and fixtures say shard file, shard build or output by what
they mean ("shard file name", "files in the shard file").

Kept: `treeSetRows`'s `product:` option and `riggedHulls.ts`'s
`productFiles: false` (sharddev contract), with the fixture
`nalati-rig-group-author-original.json`'s copy; the pools' comments
naming the engine's `product.url`; the engine's headless loader, its
`product` object and keys in the CI journeys and the lifted fixtures
typed on the engine's `ShardProduct` (`nalati-king-data.ts`,
`headless/nalati-mounted-raid.ts` with its cache's `product` key,
`nalati-predators-native.ts`, `nalati-weapons-native.ts`,
`nalati-species-world.ts`'s `productSpeciesCatalogue`, `builtProduct`);
`product-coverage KOK-1` (a doc name); the CI proofs every shard repo
shares, and `nalati-walk.test.mjs`'s import of `product-play.test.mjs`.
Those change with SA23 / SA25 across all shard repos at once.

`pnpm test` and `pnpm check` pass. A generator edit makes the hero
stale; the revision pass rebuilds it. No upload.
