# FAST-RELEASE FR-A4: the kit's publish stamp

- opus-relaudit. This repo's publish.yml, publish-cook.yml and publish-shard.mjs were hand-edited kit copies (the SA7b
  wording), so repo-kit's consumer sync called them diverged, ran red from 11-20 and stamped nothing. Took repo-kit's
  copies (4fa9956: the gate waits on its commit's queued ci, ubuntu only, a follow-up cook is recorded, a taken version
  is never sent) and `kit.mjs apply`'s script updates.
