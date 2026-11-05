# shard-nalati: PRD

Status: draft 2026-11-05: drafted by Claude from `Raynos/project-wildshard-meta` plans, for Jake to correct.

Living doc: **what** this repo does and **why**. How it is built is
`docs/design.md`; decisions are `docs/decisions.md`; the first plan is
in `docs/plans/`. Requirement ids (`R-1`) are stable: cite them from
plans, commits and tests.

## In Jake's words (REPOS.md)

> Depends on sharddev, uploaded to api-server

## One line

The Nalati Grasslands shard: the Tian Shan steppe on horseback, painterly.

## Requirements

- **R-1**: The Nalati Grasslands shard: its source, generators, Blender sources, quests, data, tests, `explore/` harness and art
- **R-2**: Building its shardfile with sharddev in CI and uploading it to api-server

## Not this repo

- Validating or cooking its shardfile (api-server validates; the engine cook worker cooks)
- Engine or SDK code (engine, sharddev)

## Who uses it

- (none)
