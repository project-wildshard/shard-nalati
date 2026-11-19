# Make Nalati's candidate-boundary controls blocking

J440 promotes the controls after the available daily runs. Both scheduled
runs, 44133681293 and 44350839154, executed all 16 cases with no failures or
skips. The 26-second run spent 379 ms in the controls.

The existing CI step now fails the check when the controls fail. It still
uploads their raw output and exit code. The separate daily soak is retired.
