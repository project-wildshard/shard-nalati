# HS1: CI boots the room's world

> Written by: Claude (opus-hs1), 2026-11-13. Meta SERVER-PARITY HS1.

The CI journeys booted `createTrustedHeadlessAdapter` or `createTrustedHeadlessResident`, the bare trusted resident: a
world no player runs, with no chapters, doors, discoveries, owned book, room loot or real respawn. They now boot the room's
own composition through `@wildshard/engine/host/openWorld` (`openWorldAdapter`, or `openWorld(input, { room: true })` and
its `resident`), on engine `0238dc7e`. The engine pin is also a pnpm override, so sharddev shares the one copy: two engine
copies split the sim loader's module cache (Driftwood's owned journey failed on it).

The taming journey no longer installs chapters by hand. With the story running from boot, the bond files `tamed:horse`,
and the tame and Aqbars feats are filed once each. The room's tame ends further from the kokpar field, so the ride takes
a run-up point first and meets the line already facing along it.
