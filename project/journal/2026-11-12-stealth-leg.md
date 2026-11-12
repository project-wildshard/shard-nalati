# Stealth leg: feather grass and the herd's eyes (meta BUILD-MAX NAL-3)

- `test/ci/stealth-journey.test.mjs` starts from spawn, so it is its own file and the taming journey stays at ~35 s. It
  walks through the camp gate into the feather grass: the one-time TALL GRASS hint shows, the crouch disc latches, a
  jump drops the latch, holding crouch reads Hidden (cover 1.0), standing reads Visible, and leaving the field takes
  crouch away. Then over the bridge to the horse plains, where running upright at the herd reads Noticed, then
  Detected, with the chevron on a horse. About 6,400 ticks, ~8 s locally.
- The headless resident has no stealth owner of its own (stealth is the page's), so the test runs the page's law,
  `game/stealth/stealthLaw` (the core of `stealth/controller.ts`), beside the host the way the engine's native stealth
  proof does: stepped with the pose the page samples, fed the native grass, herds and packs. Nothing writes cover,
  awareness, latch or state.
- No game bug found on this leg.
