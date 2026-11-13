# Nalati hero recapture

- opus-shardred-b: ring-2-content was red: `wildshard pack` refused the
  cut because the hero stamp (stamp-existing, 00:40 UTC) predates
  6b17550, 126d7bb and 91b6d4e. `--stamp-existing` refuses moved
  content, so only a capture fixes it.
- Captured with `wildshard hero` (no declared camera: spawn view) from a
  detached engine worktree at b53de789: pins installed, `out/nalati-grasslands`
  replaced by this repo's `pnpm build:shards` product with its
  `validation.json` revision set to the engine tree's, then
  `WILDSHARD_PREPARATION_ONLY=1 node scripts/build-app.mjs` under heavy-lane
  and `scripts/preview-server.mjs` on 127.0.0.1:4911.
- The released (pinned) Nalati captured in the same build gives the same
  picture, so the content has no visible change. The old card was curated
  art, never a spawn view; the new card shows the spawn view as it renders
  on engine main today (flat dusk sky, block skyline on the horizon).
