# Nalati phone Low memory cuts

> Written by: Codex
> **State:** 2026-11-17, MEMORY-GATES MG11 and shard plan NM1.

The body bake stored byte-identical parts at separate offsets for different
variants. The runtime product now shares their storage. The reader still copies
each animal's geometry. The [byte comparison](nalati-memory-2026-11-17/body-parity.json)
matched all 1,558 parts across 27 variants, including material groups, and
matched the attribute layout and skeletons. The inflated bank fell from 8.73
to 5.49 MB and its wire size from 2.58 to 1.70 MB. The historical source oracle
still reproduces all five pinned files.

The place geometry split was tested separately and left out. Both consumers
had inflated the same 22.43 MB bank. The trial gave scenery and fixed draws
separate 13.43 and 9.00 MB lanes. The [byte comparison](nalati-memory-2026-11-17/geometry-parity.json)
matched the complete raw bank, all 36 actor addresses and both tiers' scenery
rows. The observed boot peak rose. The epoch-2 estimate was within one kB of
the original.

## Reproduction

Use shard-format source `52f184e` for the epoch-2 estimates and engine
`8af8cb73` for every local preparation client. The probe uses engine
`3cd2dd87`'s renderer ×2.0 calibration. Each variant starts in a fresh
Chromium phone context at 402 × 874 CSS pixels, DPR 3, Low graphics.
The local author build leaves out legacy GPU aliases and GLB fallbacks. Both
products were prepared with the same 96 tracked author assets as local
mounts through the engine's normal local pin admission. Each preparation
client embeds the exact index receipt for its product. A candidate served
through another product's preparation client takes a different admission
path and is excluded from the comparison.

The six Explorer comparison panels have a live UI reader. A resize trial cut
53 MB from the estimate. Its first process readings mixed admission paths, so
they cannot establish a memory change. The original panels remain in source.

## Results

Each test reports the renderer peak under the loading card ×2.0 in decimal MB.

| Exact-receipt trial | Baseline, three boots | Candidate, three boots | Median change | Epoch-2 worst playing / loading |
| --- | ---: | ---: | ---: | ---: |
| Geometry split | 2,082 / 2,271 / 2,144 | 2,135 / 2,242 / 2,268 | 2,144 → 2,242 MB | 1,324 / 1,412 → 1,324 / 1,412 MB |
| Body deduplication | 2,127 / 2,082 / 2,107 | 2,287 / 2,089 / 1,962 | 2,107 → 2,089 MB | 1,324 / 1,412 → 1,320 / 1,408 MB |

The body cut's memory saving is exact within the bake. The cold
process ranges overlap. Both envelope checks remain above 1,000 MB,
and the measured phone peak remains above the 1,500 MB refusal line.
The 197 MB legacy runtime charge is still in epoch 2. With that charge
and the shared allowances held fixed, zeroing the shard's own library,
tiles and far/near scene in a diagnostic model still gives 1,016 MB
worst loading.

The baseline allocator capture at finish showed 1,107 MB renderer
footprint and 468 MB of allocated ArrayBuffer objects. The separate
collected-object profile attributes 32 MB of sampled allocation over
boot to the engine's script instruction parser and 17 MB to fuel
inspection. These sites are cumulative samples.

[Before](nalati-memory-2026-11-17/spawn-before.png) ·
[Geometry split](nalati-memory-2026-11-17/spawn-geometry-split.png) ·
[Shared body parts](nalati-memory-2026-11-17/spawn-shared-body.png) ·
[Probe and estimate data](nalati-memory-2026-11-17/memory.json)
