# Hero stamp

> Written by: Claude (opus-herostamp), 2026-11-12

sharddev now refuses a cut whose hero (the SHARD SELECT card) is older
than the shard's content, by a `hero.json` stamp beside the manifest.
This repo's heroes came with the lift on 2026-11-07 and had no stamp, so
the pin bump would have refused the next cut, and recapturing from the
spawn view would have put a plain shot over the curated art.

The commits since the heroes were made are physics, herd, kokpar and test fixes (forest trunk colliders, the tai-qazan drop), not changes to what the grasslands look like. So the existing heroes are stamped as current with
`wildshard hero src/shards/nalati-grasslands --stamp-existing`. The next real
content change needs a capture:
`wildshard hero src/shards/nalati-grasslands --base <served-build-url>`.

sharddev main needs shardfile `0786a04` (`featureSides`), so the format
pin and its override move with it, to sharddev's own pair. Engine stays.
