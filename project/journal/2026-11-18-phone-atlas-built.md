# Build the phone atlases instead of keeping them by hand (S12f3)

The 20 UASTC phone atlases under public/assets/nalati/phone-atlas/ were
hand-made by sharddev's bake-astc6. The model-parts step now encodes each
phone model's atlas from its own paint with the sdk's checked Basis
encoder, the same UASTC recipe, so the bytes come out identical: the
built shard file did not change (062175d8). opus-bb9, meta
SHARD-SOURCE S12f3.
