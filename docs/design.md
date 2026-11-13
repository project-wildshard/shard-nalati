# shard-nalati: design

Status: draft 2026-11-05: scaffold only; the real design arrives with the import.

Living doc: **how** this repo is built. What it does and why is
`docs/prd.md`. Keep this true as the code changes.

## Today

Only the scaffold exists:

- `kit/cli/`: the CLI (`--version`, `--help`; commands arrive with the import).
- `kit/test/helpers/`: shared test helpers; `git.ts` makes real git repos in temp dirs.
- `src/scripts/`: repo tooling (asks, md-wrap), plain JS.

## Dependencies

- `sharddev (build)`, by git tag (`github:project-wildshard/<repo>#vX.Y.Z`)
- `engine (runtime, via sharddev)`, by git tag (`github:project-wildshard/<repo>#vX.Y.Z`)

## Boundaries the checks enforce

- None yet beyond the shared lint and type rules.

## Coming with the import

- `src/`
- `public/assets/nalati-grasslands/`
