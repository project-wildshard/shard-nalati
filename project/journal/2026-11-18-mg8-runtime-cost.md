# Nalati phone runtime tier reading

> Written by: Codex

> **State:** Measured 2026-11-18 for MEMORY-GATES MG8.

The format 0.34.0 validator refused the preceding authored product
at 700,846,587 bytes. The runtime tier reads settled Simulator
WebContent plus tracked GL, subtracts the 299 MB engine base and
divides by the 1.11 resident factor. Its sole input is the recorded
runtime row. The previous row came from engine `8af8cb73` on November 17.

Three cold pairs alternated the texture modes on iOS 27.2 iPhone 18 Pro
Simulator Safari at Phone Low under the shared measurement lock. Both
arms played source `fffff6be` to control on engine `1ec827b8`. The
runtime rows use the medians of three boots per mode. WebContent uses
three settled native samples per boot. GL is tracked allocation capacity.

| Texture mode | WebContent before → after (MB) | GL before → after (MB) | Tier charge before → after (MB) |
| --- | ---: | ---: | ---: |
| Automatic (KTX2) | 948.79 → 696.09 | 128.15 → 125.49 | 700.85 → 470.80 |
| Images first | 942.48 → 699.76 | 165.82 → 152.87 | 729.09 → 498.77 |

All six fresh readings are under 512 MiB using the existing format
calculation. The measured charge is a Simulator-based runtime estimate.
MG11 tracks the whole-phone EM11 prediction.
[Settled samples and ledger totals](../../progress/memory/mg8-runtime-cost-2026-11-18.json).

The released 0.34.0 validator passed and all 331 asset hashes and
51 section hashes matched the preceding authored build. The offline
playing and loading estimates fell from 1,155.91 / 1,459.19 MB to
1,150.19 / 1,454.20 MB. The curated hero was re-stamped from the
existing images. The author-path check passed.
