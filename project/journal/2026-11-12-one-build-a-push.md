# 2026-11-12: Nalati builds once a push

Meta TEST-SPEED TS16e (BUILD-MAX-APPROACH RK-4), the shard template
from repo-kit `docs/shard-ci.md`. A push used to run `pnpm build:shards`
twice: `ci/check` built to walk, tame, hide, admit and test the
products (222 s), and `ring-2-content` built again (200 s) to play the
live herd and cook.

Now `ci/check` skips its build and the steps that read `out/` on a
push, and a new `ci/ring-2-content` job builds once, runs those steps,
then runs the author commands, the live-herd walk and the cook on the
same `out/` when the push touches the paths `ring-2-content.yml` used
to watch (compare API; an unknown base plays). `ring-2-content.yml`
keeps the nightly run and dispatches. Pull requests and candidate runs
still build in check.

One job, as in Pine Hollow (TS16f), not Open Plots' products + play
split (TS16d): `pnpm check` is short here, so a hand-off would only
queue a second setup in front of the cook. The job runs check's walks
in series with the cook, so the wall grows by about their length while
a push saves one build and one setup.

The first run (43282532284) took 649 s against 456 s before: build
245 s, then 115 s of check steps, the walk and a 209 s cook in series.
The cook reads `out/` and writes only its own temp folder, so it now
starts right after the build and runs beside check's steps; the last
step waits for its verdict and prints its log.
