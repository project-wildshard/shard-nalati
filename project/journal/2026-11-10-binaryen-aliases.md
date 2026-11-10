# Trim unused Binaryen command binaries

NM6 keeps the Binaryen JavaScript compiler APIs and removes only the
unused command binaries through the published pre-bundled aliases.
Both root overrides are required; a dependency SDK override is not
inherited by this root.

The SDK advances to published b9f8700 because its real compiler identity
reader accepts the fork package name while still hashing the actual
manifest and source bytes. Engine and format dependency strings remain
byte-identical. The format resolver override spells the same immutable
commit already present in the previous frozen lock, including roots
whose original direct specifier uses its abbreviated hash.

Frozen installation, normal full pre-push and real Linux build CI must
prove this pinned graph; managed local aliases are not installation
evidence. Compiler version choices, source programs and shard files
are unchanged.

Local frozen installation passes with a project-local virtual store.
Both compiler directories are 14,684 and 13,440 KiB; all four API and
declaration files match the original npm packages byte-for-byte.
J206 one-shot review reports no MUST-FIX or SHOULD-FIX.
