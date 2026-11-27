# Republish Nalati for the release cook

Reserve 0.0.10 for the normal staging publisher before the SF6 re-pack.
The old live identity migration differs from the current chain. Fix the
publish's main CI first. CI21 now pins the exact files from the reviewed
Node 26 migration, whose only changes were retired CLI flags. The test
boundary still checks an external tool through its current src/scripts
entry point.
