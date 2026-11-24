# CI21 lint: the rapier fixture's unused import

> Written by: Claude (lane opus-prune1)

The wave 3 roll (`a964327`) moved `native-rapier-file.ts` onto the SDK's `engineRequire` and left `createRequire`
imported, so main's ci21-source lint failed (run 45292424430). The import goes; the CI21 candidate lint passes.

- Follow-up: the CI21 retention record (`test/ci21-candidate-ports.json`) pins the fixture's blob, so it now names
  the new blob `5810a64`; `scripts/ci21-wire-retention.mjs` passes.
