# 2026-11-23 SI6: engine internals through the sdk

> Written by: Claude (opus-compat-w12)

- SHARD-COMPAT SI6 with the SI5 tail: tests, fixtures and scripts read engine internals through
  `@wildshard/sdk/internal/engine` and the harness through `@wildshard/sdk/headless`; CI21 records move only the
  blobs that swap changed. Left: candidate plumbing (`candidate-format.mjs`), oracle fixture strings, and the
  ci21-candidate tsconfig `types` line (needs sdk 0.4.28's `@wildshard/sdk/headless/game/types`).
