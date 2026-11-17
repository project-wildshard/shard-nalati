# Nalati's original native oracle inputs

> Written by: Codex
> **State:** 2026-11-17, NP1 fixture repair.

Running the original singleplayer constructors at `65925fa862` matched
the pinned boot hash and the 32,432-byte assembly. A field-by-field
comparison found one pasture artifact digest and two assembly $refs.

The herd fuel fix changed `herdBindings.as` and `herdGroup.as`. Recompile
their original blobs only for the historical boot oracle. The shard's
live pasture continues to use the fuel fix. SA20 renamed the clamp and
terrain-entry assembly hosts. The assembly oracle validates those live
references before projecting their original wire spelling.

The two original test bodies, byte lengths, hashes and first-kill skin
assertions are unchanged.
