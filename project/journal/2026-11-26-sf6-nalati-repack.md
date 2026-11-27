# Nalati carries all its art (standalone SF6)

> Written by: Claude (lane opus-cookktx2), 2026-11-26.

Nalati re-packs as 0.0.10 with every file it reads inside its pack and
images only (J525). The SDK 0.8.0 migration runs first: the re-pack
builds on the SDK family that pins shard-format 0.82.1, packed from
sharddev until that release is out. Nalati used no legacySlot, so the
migration changed GUIDE.md and the migrated marker only.

## SF6a: the boot inventory roots

The art move put the baked and GPU trees under
`/assets/nalati-grasslands/`, so the boot inventory's four roots
overlapped and the SDK refused them. Two roots now: the zone's own
folder and engine's `/assets/baked/common/`. The build then runs to
the images-only refusal (SF6c).
