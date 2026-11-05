# shard-nalati: import from singleplayer

Status: draft 2026-11-05: waits on S1 and S2 for this shard (P1-IN-TREE.md); sharddev moved (P4).

One-page runbook for bringing this repo's code over from
`Raynos/project-wildshard-singleplayer`. The why and the full plan live in `Raynos/project-wildshard-meta`:
`docs/multi-repo/MULTI-REPO-PLAN.md`, `P1-IN-TREE.md`, `MOVES.md` (phase P5).
Live cross-repo status: `docs/multi-repo/STATE.md` there.

## What comes in

From `Raynos/project-wildshard-singleplayer@727236c625` (paths may move before the import; re-check them then):

- `src/shards/nalati-grasslands/`
- `public/assets/nalati-grasslands/`

Lint debt to clear first (P1 S1): generator 40, engine 6.

## Before the import

- S1 and S2 for this shard (P1-IN-TREE.md)
- sharddev moved (P4)

## Steps (MOVES.md, the standard move)

| # | Step | Done when |
|---|---|---|
| 1 | Freeze: tell the singleplayer lanes, pause commits to the moving paths, record the SHA | The SHA is in this plan |
| 2 | Import commit: copy the paths at that SHA into this repo; the message names the SHA and paths (J12) | One commit, nothing else in it |
| 3 | Binaries over 1 MB go to R2 by hash (J13) | The pre-commit size cap passes without `ALLOW_BIG` |
| 4 | Green: `pnpm check` and CI pass; imported code that fails the strict lint goes under a shrink-only ratchet (D28) | CI green on `main` |
| 5 | Release (not a dependency of other repos: skip) | The tag installs as a git dependency |
| 6 | Switch: singleplayer uses this repo (git dependency or deploy) instead of its own copy | Singleplayer CI green |
| 7 | Delete the paths from singleplayer in one commit naming this repo and tag | Gone from singleplayer |
| 8 | Unfreeze; record the move in the meta repo's `STATE.md`; set this plan to finished | STATE.md says moved |

Rollback: until step 7 singleplayer still has everything, so drop the import commit.
