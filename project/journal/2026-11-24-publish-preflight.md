# Publish refuses a format its cook can't read

Meta QA-11-23-b row 44 (J505). `publish.yml` runs repo-kit's `scripts/publish-preflight.mjs` after the install and before the build. It refuses when a cook the channel reaches (staging, and production for prod) can't read the shard-format the installed SDK writes, and names the engine the SDK needs. SDK 0.4.30 (format 0.74.1) uploads to staging's v0.1.79 cook (0.73.0) each ran about 30 minutes before the cook refused them. opus-pr6.
