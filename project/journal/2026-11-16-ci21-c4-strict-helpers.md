# Make candidate helper lint observable

> Written by: Codex
> State: qualification gate fixed, 2026-11-16.

The author configuration excludes test fixtures. Explicit file arguments
did not override that exclusion. Candidate lint now inherits every author
rule while clearing file exclusions, and compares oxlint's actual selected
files with the complete compiler closure before invoking pinned native
type-aware lint. A missing helper fails rather than producing an empty pass.

Fix the exposed helper issues without weakening an oracle: equivalent
property spelling/imports/explicit return boundaries, preserved JSON input
admission and clone semantics, unchanged scope retirement, exact native
Node reads, and parsed channel inputs. Two Node-import comments name the
existing native-only fixture boundary; no type or oracle rule is disabled.
Full compiler, strict native lint74files, retention and all70cases pass
on exact engineb7788faf, runtime115.56s. The original case inventory now
handles preserved serial describe groups and fixed weapon-mode template
titles; four refusal/retention controls pass.

Source CI retains actual installed graph identity and raw JSON case
results. Existing product jobs remain separate. Default promotion and
paired engine removals remain C10/C11.
