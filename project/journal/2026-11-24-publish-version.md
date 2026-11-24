QA-11-23-b row 47 (J505): the kit's publish-version.mjs (repo-kit 98b8190) picks the version; auto skips every
version an upload holds, refused ones too (api a17171c), and the preflight refuses a taken version with other
sources before the build, naming the next free one. Warns and goes on until the API deploy.
