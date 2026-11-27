# Nalati CI21 candidate rebinds after the art move

- opus-pins (SF24): c9c17d1 rewrote /assets/nalati/ to /assets/nalati-grasslands/ in CI21 fixtures; 0843305 rebound the wire record but not ci21-candidate-ports.json, so ci21-source stayed red. Rebound the 30 moved files there.
- The URL rewrite also moves three original outputs: species.json (+33 bytes), placeRuntime and shapeBook. Re-recorded their pins in nalati-species-files.json and nalati-place-runtime-files.json (ring-2-content's red).
- Guard: lint:ci21 now runs the candidate retention too, so the pre-commit lint refuses a stale candidate binding.
