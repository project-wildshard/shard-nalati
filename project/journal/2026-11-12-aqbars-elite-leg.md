# Elite leg: Aqbars the Pale felled at her crags (meta HOW-WE-BUILD NAL-4)

- `test/ci/aqbars-journey.test.mjs` walks from spawn over the Kunes and the plains to Aqbars' crags in a room world
  (held arms and elites run there), swaps to the sabre and fells her on real inputs: held heavy swings and taps, the
  camera pitched at her head, standing off while she is up on a ledge. Her five swipes are each broken before their
  first contact and stagger her, so the player wins at full health. The elite core files the kill once and starts her
  20 minute respawn. About 7,000 ticks, 13-15 s locally. Mutants (her rule `night`, `respawnMin` 0) fail it.
- Found on the way: the sabre's flat swing never reaches her crouched body; it needs the camera pitched down at her
  head, as the engine's King proof aims. The room world files no `felled:aqbars` flag; the kill lives in the
  `nalati.elites` record (`kills`), which the chapter's `elite2` source reads.
