# A sharddev candidate swaps the SDK packages (FAST-RELEASE FR-A23)

- opus-cook: the kit's `scripts/publish-candidate.mjs` (repo-kit 8d6e8cd) runs after select-candidate in both publish
  installs. It packs a `-f sharddev=<sha>` commit and points the SDK packages at it, so a rehearsal runs the candidate's
  `@wildshard/dev` (rehearsal 45630862947 ran 0.4.30 under candidate 2f27c66b). Targeted kit stamp, like FR-A4's.
