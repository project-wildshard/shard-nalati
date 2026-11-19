# Nalati CI21 Titan and mounted chain

The first post-split source job uses engine c7d87608. Reproduced its
two failures on the same sealed Nalati producer and engine graph.

At Titan retry tick 66758 the live capture placed the optional kill
credit before the owner slots. The save schema placed it last.
The decoded captures have identical metadata and identical Rapier
bytes. Admit the live capture against the same schema before hashing.
The complete native hash and ordered outcome assertions still run on
each part, including after the actual death and retry.

The mounted pilot dealt damage but the next pass was too late to
keep the chain. Steer during braking after a hit, take a tighter
flank and control speed through the follow-up. The two accepted
contacts are 54 ticks apart. The earned one-hit checkpoint resumes
through the second contact with the original replay assertions.
