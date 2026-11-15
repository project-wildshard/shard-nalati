# The earned tulpar wakes Jel Ata

> Written by: Codex
> State: mounted start implemented; restore needs engine, 2026-11-15.

The existing taming/kokpar journey continues from its earned saddle to
the Wind Cairn. The rider slows for turns and climbs the cairn's west
approach. The single-player Storm setting goes through the installed
climate input route, then the real nearby strip press ties the fight
and starts Jel Ata's intro. Entry grants neither victory nor reward.
No trust, mount, pose, weather state or quest flag is written directly.

The first natural storm is 12–18 game minutes away. Using the real
Storm setting keeps the existing 240-second Ring 2 cap; the complete
five-case journey takes 40.5 seconds locally, the Titan extension 4.3.
Both existing CI jobs still run the file, with every old assertion.

TITAN_CHECKPOINT records an actual uninterrupted intro checkpoint and
its next five input ticks after all existing journey assertions pass.
scripts/probe-titan-restore.mjs admits that bundle and compares the
opaque continuation without sorting or repairing it. Engine 0.1.18
fails: the first entity-order difference is index 35, nalati.king.body
versus creature:36. Restored witnesses also re-emit already-earned
Tame/Kokpar facts; that replay alone is not called a new grant or bug.
The complete mounted continuation differs and remains an engine row.
The intro restore, Titan phases, victory and reward are still open.
