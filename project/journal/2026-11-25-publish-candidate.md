# A sharddev candidate swaps the SDK packages (FAST-RELEASE FR-A23)

- opus-cook: the kit's `scripts/publish-candidate.mjs` (repo-kit 8d6e8cd) runs after select-candidate in both publish
  installs. It packs a `-f sharddev=<sha>` commit and points the SDK packages at it, so a rehearsal runs the candidate's
  `@wildshard/dev` (rehearsal 45630862947 ran 0.4.30 under candidate 2f27c66b). Targeted kit stamp, like FR-A4's.
- The kit's fix (repo-kit 969f1af): a candidate also moves the format pins to the packed SDK's own, after the Linux
  rehearsals 45645618347 and two more built the 0.4.34 candidate against this repo's format 0.74.1.
