# 2026-11-15: tick time near the herd, on the Mac mini

> Written by: Claude (mini-shardgfx)

Meta SHARD-REPOS SH-nalati-8: "Nalati near a herd is still over budget
on the VPS, and nothing fails when it worsens." `test/mini/herd-tick.mjs`
opens the room's world (the one the grid server ticks) from the built
product, runs the player from spawn over the bridge to the horse plains on
real inputs, and times every step while it chases the plains herd.

The first run measured nothing: the herd bolts from a running player, and
following the middle of all 27 horses led away from it. The script now
chases the nearest horse's own group and refuses a window where the herd
was near for under half of it.

On the mini (M5 Pro, engine 0.1.18), three runs: near-herd p95 3.52,
3.56 and 3.27 ms, against about 1.0 to 1.6 ms idle at spawn; 12.3 horses
within 40 m on average for 1,594 of 1,800 ticks; none over 16.67 ms. The
baseline is one reviewed line keyed by engine, platform and CPU. These are
not VPS numbers.
