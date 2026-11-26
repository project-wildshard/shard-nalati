# nalati-boot-check runs again (opus-chunk2, meta QA 11-25 row 82)

- It imported ./shards.mjs, a singleplayer helper that never came across in the lean move. This repo holds one zone,
  so --shards defaults to nalati-grasslands and takes a comma list.
- Proof on a local engine build (b9e43a2cd, preview on 127.0.0.1:4391): nalati-grasslands booted in 19 s, 0 errors.
