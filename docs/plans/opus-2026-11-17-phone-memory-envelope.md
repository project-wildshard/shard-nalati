# Cut Nalati Grasslands to the 1.0 GB phone envelope

> Written by: Claude (lane mini-zonemem)

> **State:** draft, 2026-11-17. One cut row, unclaimed. Opened by meta
> `docs/plans/MEMORY-GATES-PLAN.md` MG11 (J410, Jake 2026-11-17 ~17:05
> Cancún: *"all the zones should be optimized for memory"*). The
> phone's target is engine `PHONE_PLAYING_BYTES`, 1.0 GB; J408's
> 1.5 GB refusal is only the safety net.

## Measured (2026-11-17, Mac mini)

Product: the pinned revision 2 (source `caf853de`), which engine
`test/pins/shardfiles.json` ships. A local `pnpm build:shards` at
`4a979b7` has the same estimate but is not prepared (its phone KTX2
textures are missing), so the probe used the pinned product.

| Instrument | Reading |
| --- | --- |
| Epoch-2 estimate (format main `52f184e`) | worst loading 1,412 MB, playing 1,324 MB |
| `wildshard memory`, v0.1.36 client, Low, 2 runs | Chromium renderer + GPU 1,791 / 1,763 MB |
| Loading renderer peak x2.0 (engine `3cd2dd87`) | **2,239 MB predicted phone peak** |
| iOS Simulator Safari, boot / after 2 min | WebContent 0.875 / 0.941 GB + GPU 0.184 GB |

The predicted peak is over the 1.5 GB refusal line too, but the
estimate (1,412 MB) is under it, so MG3's phone card would not
refuse Nalati: the phone would load it and could be killed.

## Top allocations

- **JS heap during the load:** 486 MB peak inside a 1,120 MB renderer
  (the `modules` step). Live JS heap at ready is 88 MB, so most of the
  peak is load-time garbage and transient copies.
- **Native resident reading:** 197 MB (`progress/memory/
  g258-accounting`), plus 168 MB shader compile and 41 MB held spawn
  parts in the boot charge.
- **Scene at ready:** 37 MB geometry arrays, 54 MB textures (64).
- **Files, decoded, phone tiers:** binary 81 MB, image 71 MB, glb
  30 MB. Largest: `world/places.bin` 22.4 MB, `actors/bodies.bin`
  8.7 MB, and look-loop comparison images shipped as UI
  (`ui/images/compare-{0,1,2}-{target,live}`, about 7.5 MB each,
  ~45 MB together).

## Rows

| Row | Work | Done when |
| --- | --- | --- |
| NM1 | Cut the load transient and the shipped extras. Drop the `compare-*` images from the product if nothing in play shows them; stream or split `places.bin`; find what the 486 MB load-time JS heap holds (sampling heap profile with collected objects) and release it before control. | `wildshard memory` on the prepared product predicts at most 1,000 MB (loading renderer x2.0) and the epoch-2 worst loading is at most 1,000 MB. Record shard and engine SHAs. Then lower the CI ratchet (MG11) to the new peak + 10%. |
