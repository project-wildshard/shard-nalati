# Build the shard on CI

The lift proved build:shards on the Mac, whose ancestor node_modules
can supply undeclared packages. Add the real build command to the clean
runner after check, retaining shard and hook tests. CI now has to cook
the shard using only this repository and its locked dependencies.

This change uploads nothing and alters no settings. Runner failures
will be reproduced and repaired here when this shard owns them; engine
and sharddev defects are listed in the cross-repo report instead.
