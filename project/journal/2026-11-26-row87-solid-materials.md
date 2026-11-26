# The page's solid materials stay through a plain solid-owners run (opus-chunk2, meta QA 11-25 row 87)

- A run of solid-owners.mjs without --page put the pieces' surfaces (wood) over 10 solids whose material the page's own
  colliders choose: the hay pile's grass, the Kunes bridge's planks, the Kurgan dungeon's metal and stone. The committed
  rows were right: eb64606 wrote them from the page (side parity's page half), which is what the game plays.
- The page's choices that differ from a piece's surface are recorded in src/data/solid-materials.json (a --page run
  writes it), so a plain run writes the same rows; test/solid-owners.test.ts fails when the rows and the tool drift.
