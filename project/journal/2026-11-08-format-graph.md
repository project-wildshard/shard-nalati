# Align the defining format graph

Hosted builds reproduced a real mixed-version failure: the author used
new format schema objects while the old engine held the previous root.
Named provenance correctly refused that foreign identity. Pin the same
published engine80d5cc0 and SDK8647263 at the author root. Keep the strict
schema identity guard and every existing build, test and sanity check.
The SDK provenance case passes on the aligned graph in1.06 seconds.
No shard source, rendering or asset bytes are edited by this fix.
