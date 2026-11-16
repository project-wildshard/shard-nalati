# Reproduce the remaining Nalati journeys

> Written by: Codex
> **State:** reproduced; engine repair pending, 2026-11-16.

SH-nalati-1 to5 follow TC40, Pine and SH-ALL-5. Build the released
producer graph once: engine0.1.18, SDK0.2.12, format0.4.9. The full
Nalati source build passes68.2seconds. Candidate selection removes
its legacy global format override so the candidate keeps its schema.
A provenance helper checks pnpm's actual resolved tarball and Node's
actual package path for producer and exact runtime separately.
Source pins and lockfile are restored after runtime checks.

The full existing taming, kokpar and mounted Titan start passes all5
checks on both the released producer (50.817seconds) and exact engine
candidate dc0a043e (23.231seconds). Both record genuine uninterrupted
checkpoints; no pose, health, story flag or saved field is granted.
The separate five-tick replay fails on both. Current differences:
King body's insertion precedes creature36 originally and follows the
dynamic population on restore; one extra body-band row appears for
hidden stallion creature19; eagle creature40's height differs, and
tame/kokpar facts repeat on the first resumed tick. These are actual
failures, not accepted continuation. Preserve whole snapshot order,
physics and effects in the eventual acceptance check.

Extend the existing King diagnostic through300real retry frames.
The King is at outdoor24.6364 on reset and suffix1, while the player
stays at140. By suffix2 the King is back at140.57 and stays there.
The actual fault is a transient reset pose; retain that detail when
choosing its repair and playing the full reward journey. The same
trace reproduces on dc0a043e. No engine source change is made here.

All probe logs, earned checkpoints and compact diffs remain in owned
tmp/codex-shards-nalati. The source API/cold-cook group is still in
hosted acceptance; this branch is preparation for the next group.
