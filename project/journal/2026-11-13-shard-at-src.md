# Shard source at src/: tried and reverted (SA24, opus-sa24b)

> Written by: Claude (opus-sa24b), 2026-11-13

- `3f7d0f3` moved `src/shards/nalati-grasslands/` to `src/` (meta
  SHARD-AUTHORING SA24) with sdk v0.2.8 and engine `dbc3f7cc`. Local
  `pnpm check`, `test:shards` and `wildshard check` passed, but CI went
  red, so this commit reverts it.
- ring-2-content runs `src/bake/bake-nalati-poi-contacts.mjs` and
  `src/bake/bake-nalati-sign-atlases.mjs`, which reach the repo's
  `scripts/` by `../../../../`. Fixing them changes `src/`, which stales
  the hero, so the move waits for the next Nalati hero capture.
- The move's test rewrite also changed path labels inside JSON
  fixtures (`test/fixtures/nalati-physics-original.json` and others),
  which broke the native collider check. Next time, leave fixture JSON
  labels alone.
