# Goldens: nalati-grasslands

> Written by: Claude (opus-k9, REPO-KIT K9, 2026-11-11). Carried from singleplayer `art/shardfile-goldens/` and
> `art/legacy-goldens/` (`08e4a21f69`). Jake, 2026-11-11 (J273): "goldens has to go into each major shard".

The look to hold for `nalati-grasslands`: 24 cameras. The skill `goldens` runs them; the rules are engine `docs/goldens.md`.

- `shardfile/<nn>-<camera>.jpg`: the SHARDFILE goldens (G859, G873 L5), 22 px label strip on top.
- `legacy/<nn>-<camera>.jpg`: the frozen LEGACY record (10-28, G843). Never re-captured, never updated.
- `cameras24.json`: this shard's 24 cameras (eye, yaw, pitch, FOV, probe), the `nalati-grasslands` entry of engine
  `scripts/perf/cameras24.json`.
- `runs/<date>-<sha10>-board.jpg`: the rerun board (<= 500 KB) a look change lands with.

## Source

The clean 144-camera rerun on `744c3ab7e2`, captured 2026-10-29 with the capture now at engine
`scripts/goldens/capture.mjs --mode=shardfile` (muted Chromium, iPhone 16 Pro portrait, phone tier, 2x, seed 357,
midday / clear). Re-encoded at 540 x 915 with a 22 px label strip, JPEG quality 72.

## Updates

- None since the source run.

Add one line per promotion: date, cameras, ruling, board path.

## Runs

Rerun boards kept in `runs/`, newest last. Captured on the Mac mini (headless Chromium, ANGLE Metal on the M5 Pro's GPU).

- 2026-11-15, engine `5e5b0b0912` with the pinned products (mini-shardgfx, meta SHARD-REPOS SH-nalati-6):
  `runs/2026-11-15-5e5b0b0912-board.jpg`, **red, 21 of 24**: the painted sky draws as a blur on every camera that sees
  it. Engine's phone-tier cook (S12b/S12d, `tierTextures.ts` `phoneTierSize`) cut the phone panorama from 4128 x 760 to
  258 x 47 (`panorama.phone.t512-8d5cd794.ktx2`); ground, grass, river, snow and props hold.
- 2026-11-15, engine `53c41a4a68` on `plan/phone-sky` (the cook keeps a painted sky panorama at its own size):
  `runs/2026-11-15-53c41a4a68-skyfix-board.jpg`, 24/24 green; the sky is the golden's painting again. Only creatures
  move (the kokpar rider on 08). Live once engine lands the fix and releases.
