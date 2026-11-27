> Written by: Claude

# Images-only CI limits move with the cold cook (J439)

- CI 46050865905 on 465f74c: the cold images-only cook in ring-2-content took
  1845.83 s against cook-play's 1800 s test limit, and ci21-source hit its
  45 min job limit with 39 of 42 original files done (producer build 9 min,
  originals 36 min, about 47 min in all).
- cook-play's limit is now 2700 s (about 1.5x). Its wait step is 47 min and
  ring-2-content's job 70 min in ci.yml; the nightly ring-2-content.yml job,
  which runs the cook after its journeys, is 75 min. ci21-source is 70 min.
- Guard: `test/ci/ci-limits.test.mjs` refuses a cook limit under 45 min and a
  wait step or job that no longer covers it.
