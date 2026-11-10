# Preserve actual hull bytes at their author owner

The pending SDK native-collider-block file loses its old private source
paths after the split. This owner has both original metadata and the
two real hull blocks. Five explicit CI-only cases preserve every old
assertion through installed public engine, format and SDK modules.

They cover opt-in aligned ranges and world admission, copied f32/u32
words including signed zero, separate buffer ownership, complete bake
publication, missing/duplicate/invalid block refusal and recovery,
every real Nalati hull byte in order, and standard named admission of
both unchanged hashed source files. No source, pin or product changes.

All five pass locally in 0.82 s overall, maximum case 35 ms. Both the
timeout and full-body elapsed assertion keep the 9.5-second cap honest
for synchronous work. The old SDK file, registry and ratchet remain.

J206 one-shot report shard-nalati-SDK-native-collider-
20261110T000345Z-31567.md found two inherited false positives. Both
MUST-FIXes are addressed: recovery now starts with a valid leading
solid and invalid trailing solid, refuses twice, then checks the whole
recovered bake, both point/index arrays and memo identity. Every real
solid now matches its original ordered metadata and individual binary
range, so concatenation cannot hide merged or repartitioned hulls.
The named-admission SHOULD also checks logical name, kind, declared
hash, content-addressed path and compressed byte count.

Two isolated output mutants demonstrate the stronger assertions: a
partial recovered bake and two repartitioned hulls both pass the weak
predecessor assertions, then fail exactly the new case (four other
cases pass). Unmodified five-case proof remains green, max 38 ms.
No engine implementation, authored bytes or inherited file changed.
