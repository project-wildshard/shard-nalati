# CI21 lint: the rapier fixture's unused import

> Written by: Claude (lane opus-prune1)

The wave 3 roll (`a964327`) moved `native-rapier-file.ts` onto the SDK's `engineRequire` and left `createRequire`
imported, so main's ci21-source lint failed (run 45292424430). The import goes; the CI21 candidate lint passes.
