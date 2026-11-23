# OF30 Nalati half: the guest projection and the node cap

> Written by: Claude (opus-nalati2), 2026-11-22.

ONE-FORMAT OF30 moves the balbal's guest view projection (the night
riders' held-weapons programme) onto its declared species row. The
projection is 1,074 JSON nodes, which takes Nalati's shard file manifest
to 100,034, over the format's 100,000-node cap.

Most of the manifest is clientChannels (43,635 nodes) and look material
graphs (38,114). There are 316 channel programs that carry an empty
`restoreOnly: []`. That is the format's default value, so
`compactChannels` now leaves it out, which brings the manifest to 99,718.

The branch pins engine 0.1.72-next.3be11e99 and format 0.69.1, because
format 0.68.1 is the first that has the row's `projection`. The build then
stops at SDK 0.4.25: its bundled format refuses the version 0.1.0.2 that
format 0.69.1 writes. Nalati's half waits on an SDK cut on format 0.69.
Once that is out, re-record the CI21 oracle and targetBlob, re-stamp the
hero, and land.
