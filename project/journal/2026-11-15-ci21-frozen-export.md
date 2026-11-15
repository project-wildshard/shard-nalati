# CI21 frozen fixture export

The engine's CI21-H2 tests need immutable Nalati fixture inputs without
importing this shard's test source. The exporter writes selected source fixture
bytes into engine's frozen fixture boundary and records this source commit plus
the byte hash of every output. Engine consumers reconstruct only the narrow
data shape they need.
