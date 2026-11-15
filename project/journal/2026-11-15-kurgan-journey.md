# The real kurgan entrance and an unfinished fight save

> Written by: Codex
> State: entry implemented; fight needs engine, 2026-11-15.

The journey walks from spawn over the bridge and south-bank shelves,
across the plateau and up the great kurgan's timber treads. Walking
through its real portal puts the player at the elevated dromos, then
the chamber starts the King's intro. That actual opaque checkpoint
admits and resumes for five identical ticks. Entry grants no victory
or Golden Bow. The 5,243-tick case takes 11.3 seconds locally, so it
runs in Ring 2 only, with a 60-second cap, outside the quick check job.

The retry exposed an engine height bug. The King starts the intro at
140.57 and reaches 142.54 while the player stands at 140.02. After the
first player death (tick 6368, attempts 2), the player respawns at 140
but the King resets to 24.6364, the outdoor terrain below the tomb.
scripts/probe-kurgan.mjs reproduces this using only the real approach
and idle player inputs. No pose, floor or invulnerability is written.
The King retry, completion and reward remain open pending engine work.
