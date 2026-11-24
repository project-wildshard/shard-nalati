# 2026-11-24: Nalati drops the species-program feature (FORMAT-PRUNE FP15)

> Written by: Claude (opus-fp21)

The client plan's `species.program` row (the catalogue over `actors/sheep.json` and `actors/species-looks.json`) is the last
use of the deprecated species-program family on a live pin. The page now draws every creature from its declared rows and
looks (`actors/species`, `look/materials`), as Pine does; the server keeps reading `actors/sheep.json` for the patrol, which
is a named file, not the feature. The night's balbal guest reads its declared projection (engine `77425419a`), so this ships
only on an engine that has it. Local proof: the built product plays on a dev world with the same creature bodies, gaits and
poses as r8.
