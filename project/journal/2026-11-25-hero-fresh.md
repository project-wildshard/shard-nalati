# A stale hero refuses the push (meta QA 11-25 row 49)

- opus-fp54c: Dunes and Sky Reach reached main with geometry changes and no new hero, and main ci's build refused
  both on `[hero-stale]` for hours. The kit's `.githooks/hero-fresh.mjs` (repo-kit 664e601) now runs in the push
  lane's gate copy: the SDK's `wildshard hero <source> --stamp-existing` hashes the content (no capture, hero.json
  put back), and a hero stamped for older content refuses the push with the capture command. SKIP_HERO=1 bypasses.
