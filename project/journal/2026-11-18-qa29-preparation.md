# Prepare the QA29 product on the exact engine build

Take the existing release-tag override from repo-kit `78bb506`. The
QA29 candidate publishes its preparation archive under the immutable
`server-staging-f61079f8…` tag. The live staging alias stays on the
previous release while the release lane investigates its boot failure.

The installed SDK already honors the preparation URL. The publish job
keeps its source and offline memory checks and uses the new client only
for phone WebKit preparation.
