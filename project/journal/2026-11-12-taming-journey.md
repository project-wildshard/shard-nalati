# Taming journey on real inputs (meta BUILD-MAX NAL-1)

- `test/ci/taming-journey.test.mjs` boots the built product headless and tames the plains stallion from the shard spawn
  with only page inputs: run over the Kunes bridge and the south bank's shelves, stalk, hold offer, press mount at the
  prompt, lean through five bucking rounds. Nothing is written to flags, trust or taming state. It runs in the quick
  `ci` leg after the owned walk; about 6,500 ticks, 13 s locally.
- Two things the first tries taught. Crouching only in the last 8 m spooks the herd (alert 100) and the stallion
  roams for thousands of ticks; crouch inside 25 m and freeze while the HUD alert reads above 40 and the prompt comes
  in about 2,150 ticks. The engine proof's lean gain (2 x balance) got thrown in round 4 on this approach; 4 x balance
  sits all five rounds.
- The straight line from the bridge down to the plains is too steep to walk; the route keeps the engine proof's bank
  shelves (FAST-SLOW-TESTS FS4).
- Mounted and stealth are the next legs (NAL-2 onward).
