# PR6: an engine bump needs no shard edit

SHARD-COMPAT PR6. `test/ci/bump-only.test.mjs` proves an engine or SDK bump with unchanged checkpoint bytes passes with no new baseline row (opus-road's newest-recorded fallback; the run writes no row), and guards ci.yml against a fixed default candidate commit. Where ci21-source runs, its candidate defaults to the engine the shard's SDK installs (`scripts/installed-engine.mjs`, the package's gitHead), so a bump moves it with no workflow edit. opus-pr6.
