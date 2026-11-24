# FAST-RELEASE FR-A4: the kit's publish stamp

- opus-relaudit. This repo's publish.yml, publish-cook.yml and publish-shard.mjs were hand-edited kit copies (the SA7b
  wording), so repo-kit's consumer sync called them diverged, ran red from 11-20 and stamped nothing. Took repo-kit's
  copies (4fa9956: the gate waits on its commit's queued ci, ubuntu only, a follow-up cook is recorded, a taken version
  is never sent) and `kit.mjs apply`'s script updates.
- repo-kit bffce97: the gate's success line fixed after the wait (5bb03ca); the preflight refuses an unchanged hero
  before the build (FR-A5); the same bytes again ends green as unchanged (FR-A6).
