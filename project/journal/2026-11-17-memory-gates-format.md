# Use the offline phone memory line

> Written by: Codex
> **State:** 2026-11-17, MEMORY-GATES MG4 (J408).

Pin shard-format 0.23.0 so a playing or loading estimate over 1.5 GB
refuses under every offline memory policy.
The author CLI and its engine resolve the same offline gate.

Keep retired format exports available to the legacy SDK and engine.
The built product passes through the direct 0.23 validator in CI
and before publish.
