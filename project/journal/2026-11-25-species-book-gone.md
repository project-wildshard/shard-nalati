# The tests stop reading the engine's species book

FORMAT-PRUNE FP20 deleted the engine's `looks/speciesBook.ts` (engine `5dac625fc`), and sharddev's fp20 branch drops
the SDK's `internal/engine/game/looks/speciesBook` re-export with it. Two test files still read it:
`test/fake/nalatiSpecies.ts` and `test/fixtures/nalati-species-world.ts`, both only for the King pose test.

The King case now checks the King's native channel frame against the frozen pose oracle directly. Before, it checked
the native frame equal to the species book's frame and that frame close to the oracle, so the facts are the same on
the reader that is left. The "packed species bodies" case went with the engine's packed body reader (its own test went
in FP20 too). Both files and their CI21 record rows went; the King test's blob and case list moved with it. This works
on SDK 0.6.1 (engine before FP20) and after the fp20 SDK, since nothing imports the re-export any more.

Lane: opus-nalati2 (QA 11-24 row 70).
