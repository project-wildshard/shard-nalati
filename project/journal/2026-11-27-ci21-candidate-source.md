> Written by: Claude

# ci21-source reads the candidate engine's source from the lock

- After the SDK 0.9.3 bump, ci21-source (CI 46047262385) went red in
  `assert-candidate-engine.mjs`: `pnpm list --json` (pnpm 10.34.9) names no
  `resolved` for the git-installed candidate engine 922b9d45, so the check
  compared undefined with its codeload URL.
- The assertion now falls back to pnpm-lock.yaml's resolution: a codeload
  tarball, or a git commit of project-wildshard/engine read as its codeload
  URL. None or several engine sources still fail.
- Reproduced red locally on the CI install steps with the old script; green
  with the fix. Guard: `test/ci21-candidate-source.test.mjs`, run in the
  ci21-source job.
- Pine, Driftwood and the open plots carry the same assertion line and need
  the same fallback when their ci21-source runs on a git candidate.
