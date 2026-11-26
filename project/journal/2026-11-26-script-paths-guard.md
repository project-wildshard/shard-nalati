# The script-paths guard's stray check, here (opus-guard119, meta QA 11-25 row 119)

- `kit.mjs apply` brought the guard's row 119 copy (a stray `scripts/` entry is its own finding; a baseline entry
  needs a why), chunk-param-guard's update, and publish.yml without the pre-lean `scripts/select-candidate.mjs`
  fallback; `agent-sync --from repo-kit` restamped agent-sync.mjs and the NotebookEdit matcher (row 108).
- `scripts/blender/targets.json` was a dead lift copy of singleplayer's manifest (none of its 43 targets has a script
  or output here), so it is removed. check-test-boundary walked a root `scripts/` that the lean move emptied; the
  tools are `src/scripts/`, already walked with `src/`, so the dead walk goes (the check passes before and after).
