# Nalati carries all its art (standalone SF6)

> Written by: Claude (lane opus-cookktx2), 2026-11-26.

Nalati re-packs as 0.0.10 with every file it reads inside its pack and
images only (J525). The SDK 0.8.0 migration runs first: the re-pack
builds on the SDK family that pins shard-format 0.82.1, packed from
sharddev until that release is out. Nalati used no legacySlot, so the
migration changed GUIDE.md and the migrated marker only.

## SF6a: the boot inventory roots

The art move put the baked and GPU trees under
`/assets/nalati-grasslands/`, so the boot inventory's four roots
overlapped and the SDK refused them. Two roots now: the zone's own
folder and engine's `/assets/baked/common/`. The build then runs to
the images-only refusal (SF6c).

## SF6c: images only

- Creature colour maps and coats are PNGs of their pixels (`writeImagePixels`), stored as `image` files.
- The painted models' atlases are PNGs named `atlas-<hash>.png`, kind `image`, for desktop and phone; the build no longer needs the Basis encoder.
- `ktx2.generated.ts` is empty and the 66 `gpu/` mounts (38 KTX2, 28 GLB twins holding KTX2) are dropped; the files stay on disk until SF6g (Jake's word on the SF6f board).
- The shardfile now holds no KTX2 and no GLB with `KHR_texture_basisu`: 235.8 MB, 716 files.
- Still WebP: 53 mounted images and 28 mounted GLBs' images. The cook encodes PNG and JPEG only (J525), so those ship as WebP with no cooked KTX2 until they move to PNG.
- `cards-7ecab075` is engine's own public file: nothing in Nalati names it since format 0.79 dropped the near cards.

## Version

The re-pack publishes as 0.0.11: codex-r2api republishes today's Nalati as 0.0.10 for the R2 layout's staging tour.

## SF6g: the hand-made KTX2 are gone (J531)

Jake approved the cooked look (J531: "nalati cooks look good to me"), so the
66 hand-made GPU files under `gpu/` (38 KTX2, 28 basisu GLB twins) are
deleted. The coat table keeps only each tier's coat image names, which is all
riggedHulls.ts reads, and the manifest drops its `gpu/` glob.
Since engine's SF19 (cook 1.8.0) the cook encodes WebP as it does PNG, so the
53 WebP images and the 28 GLBs' WebP get cooked KTX2 too.
