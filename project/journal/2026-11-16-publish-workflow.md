# Publish workflow (meta SHARD-PUBLISH-ACTIONS, opus-publish1)

- J369/J371: a shard revision ships from Actions, not a laptop.
  `gh workflow run publish.yml -f channel=staging` gates on main's
  green tip and ring 2, checks, builds, prepares in phone WebKit and
  uploads with the org secrets in the channel's environment.
- Both files are repo-kit's (files/), stamped as kit.mjs renders them.
