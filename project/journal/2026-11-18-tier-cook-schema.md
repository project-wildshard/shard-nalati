# Carry the tier through the legacy cook

The legacy SDK depends on format 0.4.9 and its old module paths. Backport
the optional three-value tier field through the existing compatibility
patch so the cook retains the new runtime declaration in OF10c1b.
