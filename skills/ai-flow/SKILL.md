---
name: ai-flow
description: Operate the LouisClaw personal information-flow pipeline from OpenClaw chat.
user-invocable: true
metadata: {"openclaw":{"emoji":"🗂️","always":true}}
---

Use this skill when the user wants to inspect, run, or debug the LouisClaw workflow.

Workspace facts:
- The repo root is the OpenClaw workspace.
- Main commands are implemented as npm scripts.
- Intake happens through `data/landing/`, then `data/inbox/`, or `npm run add -- ...`.
- Processing writes structured items into `data/items/`.
- Daily digest output is written into `data/digests/` and mirrored into `data/exports/`.
- Standardized task ids are available through `npm run task -- run <task-id>`.
- Web/article capture should prefer `ai-flow-web-intake` for workflow guidance, while repeatable sources should prefer markdown pull.
- Visible SiYuan doc export should prefer `ai-flow-siyuan`.

Preferred command flow:
1. Check current state with `npm run task -- run status_overview`.
2. Add a test item with `npm run add -- --type text --content "..." --source openclaw --device webchat` when the user wants to simulate intake.
3. If the user wants repeatable intake from synced markdown sources, use `npm run task -- run pull_markdown_sources` before downstream processing.
4. Run `npm run task -- run daily_pipeline` to process landing/inbox and refresh digest exports.
5. If the user wants visible docs in SiYuan, switch to `ai-flow-siyuan` and run `export_siyuan` in API mode.
6. Read the latest files in `data/digests/` or `data/exports/` and summarize them for the user.

Standard task ids:
- `pull_markdown_sources`
- `status_overview`
- `process_inbox`
- `build_digest`
- `daily_pipeline`
- `export_siyuan`

Rules:
- Keep the workflow local-first.
- Do not introduce IM bot integration unless the user explicitly asks.
- Never write to any SiYuan directory except a dedicated incremental export root.
- Prefer official SiYuan API export when the goal is visible docs in the notebook tree.
- Prefer existing commands over custom scripts.
