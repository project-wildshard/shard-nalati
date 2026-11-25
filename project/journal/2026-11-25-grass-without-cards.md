# Grass without card clumps

> Written by: Claude (lane opus-nalati), 2026-11-25, meta QA 11-24 row 70

Row 54 replaced the flat grass card clumps with real blades, but the shard kept the card scene, its look and its atlas
because engine required them. Format 0.79 makes the cards optional (all of them or none), and engine reads it from the
format move after `e477966a3`. This drops them all: `grassRows`' `CLUMP`, `CARDS` and cards scene, `grassView`'s third
look and `cardsHeight`, the `nalati-grass-cards` look graph, `paintedTextures`' `cards`, `output.ts`'s `grass.cards`,
the two card atlases and their KTX2, and their rows in the generated tables (mounts, boot assets, fence reads, KTX2
table, recorded entry reads). `per` stays.

`nalati-grass-tier-source.test.ts` now checks that no tier, scene, look or file names a card. A preparation client built
from engine with format 0.79.2 enters the shard in phone WebKit in 10 s with 96 programs (97 with the cards). The CI21
retained original `test/fixtures/nalati-boot-original.json` still names the old cards: it is a frozen original.
