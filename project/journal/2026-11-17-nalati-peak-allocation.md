# Nalati loading renderer allocation census

> Written by: Codex
> **State:** 2026-11-17, MEMORY-GATES MG11 and shard plan NM1.

The heap snapshot and allocation sampling used the body-deduplicated product
`96618d35`, source commit `ad28aba3`, on the exact preparation client from
engine `8af8cb73`. Chromium ran headless at phone Low with the same viewport
and settings as the paired probe. The snapshot was triggered with the loading
card still up at `finish`. The kernel footprint was 1,059 MB, with 101 MB
of main-isolate JS objects and 319 MB of V8 backing storage. The snapshot
contains 310 MB of surviving objects and backing stores.

A separate run without a snapshot took the detailed renderer allocator
census at `finish`, at 1,026 MB. That run subsequently sampled 1,119 MB
during `readyFrame` under the card. These captures cover the observed peak
window. The snapshot can collect garbage, and the detailed allocator dump
and snapshot come from different boots.

| Bucket over 50 MB | MB | Owner and evidence |
| --- | ---: | --- |
| PartitionAlloc effective allocations | 516 | Chromium and shared engine. Its ArrayBuffer partition had 464 MB of allocated objects. The engine owns the buffer lifetimes, with shard data among their payloads. |
| V8 main isolate | 205 | Engine. Its 156 MB committed heap contains the page, scene objects and boot validation. |
| V8 workers | 254 | Engine. Worker malloc was 137 MB and worker heaps 117 MB. |
| Renderer native malloc | 169 | Chromium and shared engine. The allocator reports 129 MB of allocated objects. |
| Snapshot ArrayBuffer backing stores | 203 | Mixed. The heap paths identify 62 MB of draw geometry, 32 MB of product wire and 5 MB of decoded images. The remaining 104 MB span scalar channels, textures, audio, opaque closure-held buffers and small objects. The engine owns that lifetime census. |
| Draw geometry backing stores | 62 | Nalati scene content. The largest identified pair is the fixed-draw and arena copies of the expanded Great Kurgan interior, 24 MB together. |

Rows at different depths or from different instruments overlap. The Chrome
allocator dump reports allocations and effective attribution, and the kernel
reports resident footprint. Multiplying the renderer by two is the calibration
for the complete phone estimate.

The separate allocation sampler includes objects already collected during boot.
Its exclusive source groups over 50 MB were shared engine code (209 MB),
JSON and schema validation (184 MB), scene and renderer construction (154 MB),
third-party or unresolved frames (122 MB), script admission (73 MB), and
runtime decode (51 MB). Valibot alone had 139 MB sampled and Three core
58 MB. These are cumulative allocations. The phone peak remains the
renderer footprint under the loading card. The engine buckets were recorded
for mini-ninemem2 in the lane receipts.

The shard cut keeps the Kurgan interior indexed. Its static vertex-colour
material draws the same triangle order, positions, normals and colours from
the original baked bytes. The two renderable copies require 10.76 MB
combined with their indices, down from 24.04 MB when expanded.

The live chamber now holds 5.38 MB per geometry copy, down from 12.02 MB.
The built place bank is byte-identical, and the fixed-draw regression
checks all 36 actor shapes and every corner attribute of the chamber.
Both prepared products reached spawn without browser errors.

| Paired cold Low run | Predicted phone, MB | Median | Epoch-2 worst loading |
| --- | ---: | ---: | ---: |
| Body cut, expanded chamber | 2,305 / 2,090 / 1,980 | 2,090 MB | 1,408 MB |
| Indexed chamber | 1,796 / 2,182 / 2,134 | 2,134 MB | 1,408 MB |

The measured process ranges overlap. The draw-geometry bucket has a
13.29 MB representation saving across the two identified copies. The
phone envelope remains open with both the measured peak and estimate
above 1,000 MB. The measured peak still exceeds the 1,500 MB refusal
line.

[Low spawn before](nalati-memory-2026-11-17/spawn-shared-body.png) ·
[Low spawn after](nalati-memory-2026-11-17/spawn-indexed-chamber.png) ·
[Bucket, live geometry and probe data](nalati-memory-2026-11-17/peak-allocation.json)
