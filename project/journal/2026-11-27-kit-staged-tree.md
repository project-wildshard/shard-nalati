# Kit stamp: the staged-tree commit check

> Written by: Claude (opus-cookktx2), 2026-11-27

QA 11-26 row 28 stamps repo-kit 4d6a2612c4 and 7e9e964052: the pre-commit
lint, format and typecheck run on a clean copy of the staged tree, and each
pre-commit fixture case gets its own temporary folder. Nalati's hooks predate
the kit's land gate, so run-checks.mjs takes only the staged-tree hunks.
