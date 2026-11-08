# S1 byte-preserving lint debt

**Status:** in progress (2026-11-08): four stale counts retired;
37 actual counts remain behind the byte-identity constraint.

Baseline: af4cd8b9cece18a225cb438c1e1797464b0a73dd.
An independent census runs the same AST rules with an empty ratchet:
places.ts has one generator/engine import each, not two; yard.ts has
neither. Lower only those four stale allowances: 41 to 37. No source,
rule, dependency, map input or generated asset changes.

Two pnpm build:shards runs, without --reuse, match every product
path and raw byte: 623 files, 201702744 bytes. Comparison includes
map keys, packed blobs, index and validation; nothing normalized.

| File under generators/ | Counts retained | Why left |
| --- | ---: | --- |
| bake-nalati-bodies.d.mts | 1 | Build-to-play boundary; raw map input |
| bake-nalati-bodies.mjs | 4 | Author import boundary; raw map input |
| bake-nalati-places.mjs | 2 | Author import boundary; raw map input |
| campProps.ts | 2 | Author import boundary; raw map input |
| horseBody.ts | 1 | Build-to-play boundary; raw map input |
| kunesBridge.ts | 2 | Author import boundary; raw map input |
| nalatiGroundSource.ts | 1 | Author import boundary; raw map input |
| nalatiWorldRows.ts | 1 | Author import boundary; raw map input |
| output.ts | 13 | Author import boundary; raw map input |
| places.ts | 2 | Author import boundary; raw map input |
| stormTitanRows.mjs | 2 | Author import boundary; raw map input |
| titanFireView.ts | 2 | Author import boundary; raw map input |
| titanWhirlsView.ts | 2 | Author import boundary; raw map input |
| yurt.ts | 2 | Author import boundary; raw map input |

These rows remain open: the map key includes the raw generators/
files, including erased declarations. Source changes therefore change
the shipped map section and packed product. Acceptance for each:
separately authorize the product change, repair the boundary, build
and validate, then lower its actual count. Never weaken the rule or
remove raw map inputs to manufacture byte identity.
