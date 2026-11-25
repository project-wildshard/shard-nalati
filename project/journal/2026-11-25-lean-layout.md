# Lean layout (repo-kit R1)

> Written by: Claude

repo-kit's `docs/plans/opus-2026-11-25-shard-lean-layout.md`, row R1,
moves this repo to the lean layout in three steps.

Step 1, on the old layout:
- agent-sync and kit apply re-stamp the agent tooling and the kit.
- L4 (D34): npm-bin-deps 2.2.0, with pnpm as the bin installer and
  project settings off. The kit's `.bin-deps` profile and pins put
  this repo on the org's one shared bin cache.

The land audit (L7) puts this repo on main only, so step 2 retires
land.
