# Herd group fuel trap (meta SENTRY-TRIAGE S3, WILDSHARD-GAME-82)

- The herd's v2 group step trapped as `RuntimeError: unreachable` in `Read.context`. That was fuel running out, not an
  `unreachable()` in the shard. A herd within about 35 m of the map's edge picks a graze spot up to 16 times out of bounds
  with no native operation, so it never yields. Each pick's four bound reads paid for `Read.context`'s whole body, about
  11,500 fuel each, because the meter charges an acyclic function's whole body when it is entered.
- Fix: `Read.context` reads one bank value and sends only the member-backed keys to `Read.memberContext`. The edge loop
  in `herdGroupStep` also returns when less than 200,000 fuel remains, and the host runs the next segment.
- `test/nalati-herd-fuel.test.ts` compiles the pasture module from this checkout and runs it through the engine's own
  `GroupStepV2`. Before the fix it traps in the same frames as the Sentry event.
