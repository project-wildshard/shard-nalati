# 2026-11-23: Nalati draws with no hull book (ONE-FORMAT OF30g2)

> Written by: Claude (opus-look1)

- Every creature the rigged-hull book drew is a declared skin now: the sheepdog, Aqbars, Kokbori, Argymaq and ghost
  riders fitted to the kit quadruped, the Golden King on its own rig. The flock names its rig file. `output.ts` emits no
  `look/hull-book` or `look/rigged-hulls`.
- The looks' `hulls` flag is stripped at emission, not in the species program, so the frozen original species file
  (`test/fixtures/nalati-species-files.json`) keeps its bytes.
- Six more species rows took the generator's own `parseShardfile` 710 nodes over the 100,000 JSON-node cap. The material
  graphs are 37k of those nodes and the build lowers them to graph files anyway (D74), only after that parse; the
  declaration now lowers them first. Sections and blobs are byte-identical.
