---
name: goldens
description: Re-capture this shard's (nalati-grasslands) 24 golden cameras on a build and compare them against its known-good SHARDFILE goldens in art/goldens/, as a labelled LEGACY golden · SHARDFILE golden · NOW board, reading every panel and marking red cameras. Use for "goldens", "golden images", "re-run the goldens", "regression check", "did this break the look", "before landing a look / model / placement / sky / LOD change", "is nalati-grasslands ready for QA", or any claim that a change is pixel-identical. Not for new mockups or memory / fps readings.
---

# Goldens: nalati-grasslands

> Written by: Claude (opus-k9, REPO-KIT K9, 2026-11-11). Jake, 2026-11-11 (J273): "goldens has to go into each
> major shard": this shard runs its own goldens.

The frames are this repo's: `art/goldens/` (`shardfile/`, `legacy/`, `cameras24.json`, `README.md`, `runs/`). The
harness is engine's, run from the sibling engine checkout (`../engine`): `scripts/serve-build.sh`,
`scripts/browser-lane.sh`, `scripts/goldens/capture.mjs` and `scripts/goldens/board.py`. The rules (what counts as a look
change, the WebKit triggers, how a golden is updated) are in engine `docs/goldens.md`; read it first. A capture is a
long wait (~10 min); a subagent commits what it has and hands the exact capture command back.

## 1. Find the set

```bash
G=$(pwd)/art/goldens SLUG=nalati-grasslands ENGINE=$(cd ../engine && pwd)
ls $G/shardfile/                      # 24 x <nn>-<camera>.jpg, the look to hold
```

Never tell anyone this shard has no goldens without running that `ls`.

## 2. Serve a build that carries this shard

The game is engine's build of the pinned shard products. Your change reaches it only once engine pins it: publish it
(this repo's `docs/dev.md`, J198 prepared publications), then bump the pin in an engine worktree. Until then, capture the
pinned build and say so.

```bash
cd $ENGINE
SHA=$(git rev-parse HEAD)
URL=$(SERVE_OWNER=goldens-$SLUG scripts/serve-build.sh --head --shard $SLUG --name goldens-$SLUG --hours 1)
# an engine worktree with this shard's new pin: run serve-build.sh --shard $SLUG from that worktree instead
PORT=${URL##*:}; PORT=${PORT%/}
```

## 3. Capture the 24 cameras

```bash
RUN=$ENGINE/tmp/goldens/$(date +%F)-$(git rev-parse --short=10 $SHA)-$SLUG
scripts/browser-lane.sh --max 20 node scripts/goldens/capture.mjs --base=$URL --sha=$SHA \
  --cameras=$G/cameras24.json --mode=shardfile --shards=$SLUG --out=$RUN/raw
# WebKit pass (shaders, blending, textures, culling, anything sold as perf):
scripts/browser-lane.sh --max 25 node scripts/goldens/capture.mjs --base=$URL --sha=$SHA --engine=webkit \
  --cameras=$G/cameras24.json --mode=shardfile --shards=$SLUG --out=$RUN/raw-webkit
```

Check `$RUN/raw/receipts-$SLUG.json`: `status` `complete`, `errors` empty. A pose with `idle.settled: false` or
`live.settled: false` was still streaming: re-capture it with `--cams=<n>` before calling it red.

## 4. Build the board and read every panel

```bash
python3 scripts/goldens/board.py --goldens $G --shard $SLUG --now $RUN/raw --out $RUN/board --label "NOW $(git rev-parse --short=7 $SHA)"
```

**Open every `$RUN/board/<nn>-<camera>.jpg` with the Read tool, all 24**, lowest SSIM first but never only those. Red
= NOW lost or gained something the change didn't mean to against the SHARDFILE golden: a wall, floor, building or prop
missing, a hole, black or blank areas, seams, exposure or colour shift, LOD / texture pops, hands missing. Moving
clouds, rain, crowds, creatures and the hands' sway are not red. Burn the verdict in with the same command plus
`--red 11,12`.

## 5. Report, land, clean up

- **Any red camera: don't land.** Fix and re-capture, or, for a look change Jake ruled on, promote:
  `python3 scripts/goldens/board.py --goldens $G --shard $SLUG --now $RUN/raw --promote 11,12 --source "<sha10> <ruling>"`
  and add a line to `art/goldens/README.md`.
- Green: copy `$RUN/board/board-$SLUG.jpg` to `art/goldens/runs/<date>-<sha10>-board.jpg` and commit it here by pathspec
  with `Goldens: $SLUG 24/24 green on <build id>` in the body.
- Report the run, green / red counts, each red camera in one line, and the board path. Show Jake the board, not SSIM.
- `scripts/serve-build.sh stop $PORT`, then `rm -rf` the exact `$RUN` path.
