#!/usr/bin/env bash
# Written by `wildshard new` and `wildshard update` (@wildshard/sdk), which rewrite it: at session start, one line when
# the installed sdk has a migration this repo has not run, nothing otherwise. It never fails a session start.
cd "$(dirname "$0")/../.." || exit 0
pnpm exec wildshard status --brief 2>/dev/null || true
