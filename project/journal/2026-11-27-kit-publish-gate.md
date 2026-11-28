# The publish gate ships past bookkeeping and waits out ci

- opus-qa-tools stamped repo-kit 06346ac (meta QA 11-26 rows 56 and 64)
  by hand: the gate ships a run whose SHA trails main only by
  published.json commits, and waits on its exact ci through this repo's
  own ci budget (ci.yml job limits plus 10 minutes, 30 to 100) instead
  of a flat 30. The build job's limit is 150 minutes.
