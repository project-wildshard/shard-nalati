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

Step 2, the move itself (repo-kit `scripts/lean-move.mjs`):
- The kit's scripts are in `src/scripts/.kit/` and its tests in
  `src/test/.kit/`. The shard's own tests stay in `test/`.
- Main only (D36): `land.config.json`, land, the worktree scripts and
  their tests are retired, and AGENTS.md now says main only.
- `kit/` is retired, along with its cli and test (Q16). Any tsconfig
  that extended `kit/tsconfig.json` now has its options inline.
- The shard source stays unformatted in `.prettierignore`, as in
  driftwood. The D33 verbs are in place: dev, build, fix, and a test
  that also runs the kit's tests, the hooks' tests and the agent
  hooks' tests.

Fixups found by running the tools:
- The shard lint resolves through `tsconfig.lint.json`: the root tsconfig's
  `three` paths make oxlint misread namespace imports.
- `src/bake/bake-nalati-poi-contacts.mjs`, `src/bake/bake-nalati-sign-atlases.mjs` import tooling from `src/scripts/`. The
  SDK's build-code list predates it, so `no-runtime-in-build` is off there.
