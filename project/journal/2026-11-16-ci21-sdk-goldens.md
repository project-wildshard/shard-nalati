# CI21 original wire goldens

> Written by: Codex

> **State:** held on plan/ci21sdk-tail, 2026-11-16.

Retain test/nalati-ecology-wire.test.ts, test/nalati-view-wires.test.ts as this shard owns its actual generators.
Complete original JSON fixture bytes from engine de22e1a170 remain unchanged.
Each expected slice must have its exact row count and compare every complete
wire byte/hash/order from the real current producer. No oracle updated.
The paired SDK ports retain author type/metadata cases; these tests retain
all shard wire assertions. No source, content, pin or output changed.
Normal typecheck/lint explicitly admit every new test. Destination proof
and J206 are required before engine source removal; no land GO yet.

Normal compiler, typed lint and all focused goldens pass. Planted test
type violations and wrong complete-wire hashes both refuse, then original
sources/fixture bytes are restored exactly. Golden generator processes
finish within one second on this mini, with a nine-second child fence.
The test process boundary is compiled; installed legacy client sources
are exercised at runtime rather than falsely claimed compiler-clean.
