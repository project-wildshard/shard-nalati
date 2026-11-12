# Mounted leg: a kokpar round on the bonded tulpar (meta BUILD-MAX NAL-2)

- `test/ci/taming-journey.test.mjs` now goes on from the bonded tulpar in the same run: the reins (stick and sprint)
  gallop it west to the kokpar field, snatch the goat from the middle and carry it into a tai-qazan. The test lands
  `won:kokpar` in the rider's book, with no snatch-back. This adds about 1,300 ticks, roughly 2.5 s locally.
- The headless resident has no chapter story, so the test installs `installServerChapters` on its host. The standalone
  server's cell world installs it the same way. The test does that only after the taming checks, so taming still
  grants no flags.
- The field is a straight line: tai-qazan, goat, tai-qazan. The rider lines up beyond the near goal and gallops through
  the goat without slowing. A rider who slows for 2.5 s has the goat taken back.
- Bug KOK-1 (product-coverage plan): a horse galloped straight into a tai-qazan stops 3.61 m from the goal centre, so
  it never gets inside the 3.6 m drop. Riding past the goal's side, 3.1 m off the centre, scores.
