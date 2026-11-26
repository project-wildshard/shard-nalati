# Script paths fixed after the lean move, and the guard enforced (opus-chunk2, meta QA 11-25 row 84)

- repo-kit's script-path guard named 23 here (19 after row 82). Six tools under src/scripts kept the old
  `new URL('..', import.meta.url)` root, which now lands in src/: forest-trunks, solid-owners, nalati-chunk-views,
  nalati-faces-capture, nalati-faces-decode and nalati-models-color root at the repo again. faces-capture takes
  debug-settings from @wildshard/sdk/headless/scripts.
- Retired, as nothing runs them: nalati-camp9 (the round-4 camp measurement; its mockups stayed in singleplayer and it
  needs engine-only parity modules), bake/nalatiCoats (run only by sharddev's bake-coats, retired in row 84) and
  bake/nalatiDressing (its export has no importer; the generators use dressingInputs.ts).
- The kit's push-lane hooks are applied (run-checks, gate-report, chunk-param-guard, script-paths), and the script-path
  guard enforces with an empty baseline.
- Found running solid-owners: it now marks 10 hay-pile solids wood where src/data/physicsRows.json says grass. The data
  file is left as committed; reported to the coordinator.
- faces-capture enters the zone through enterZone (CP20 missed it; the kit's chunk guard, applied here, named it).
