# The lean move, repaired where CI went red

> Written by: Claude

repo-kit lean-layout R1 changed this repo on its way to the lean layout.
`pnpm check` passed, but CI runs more than check, and some of it named the old
paths. sharddev-55 saw main red and asked for a look. Fixes:

- ci.yml: the `pnpm test:hooks` step is gone (`pnpm check` runs `test:kit`, which holds the hook tests)
- tsconfig.json: no `three` paths (no typecheck here reads the root tsconfig; `wildshard check` lints through it, TS21)
- tsconfig.lint.json is gone, and so is `--tsconfig` on the shard lint
- public/: 1 files untracked again (the step-1 commit swept them in; they stay on disk)
- `test/candidate-boundary.test.mjs` is the pre-move file with only its own import re-pointed: the mover had re-pointed relative paths inside its fixture strings, which describe a temp tree
- `./scripts/bake-loader.mjs` and `./scripts/sim-node-loader.mjs` in bake commands, `scripts/blender/targets.json`, fixtures and a ci21 test now name `./src/scripts/`
- `test/ci21-candidate-ports.json`: targetBlob re-pinned for the files those path edits changed
- `test/ci21-wire-ports.json`: "public engine scripts/bake-output.mjs" names engine's path, so the mover's re-point is undone
