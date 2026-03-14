---
name: ai-flow
description: Operate the LouisClaw personal information-flow pipeline from OpenClaw chat.
user-invocable: true
metadata: {"openclaw":{"emoji":"🗂️","always":true}}
---

Use this skill when the user wants to route a LouisClaw request but has not yet specified whether it is capture, triage, review, synthesis, publish, or debug work.

This skill is the router, not the whole product.

Boundary facts:
- `LouisClaw` repo owns canonical local state, item records, digests, exports, and SiYuan mappings.
- `OpenClaw` owns intent routing, orchestration, and high-semantic synthesis work.
- `SiYuan` is the visible downstream knowledge surface, not the source of truth.
- Future `IM` channels should be low-friction input, notification, and light feedback surfaces, not the main knowledge store.

Workspace facts:
- The repo root is the OpenClaw workspace.
- Main commands are implemented as npm scripts.
- Intake happens through `data/landing/`, then `data/inbox/`, or `npm run add -- ...`.
- Processing writes structured items into `data/items/`.
- Daily digest output is written into `data/digests/` and mirrored into `data/exports/`.
- Standardized task ids are available through `npm run task -- run <task-id>`.
- Web/article capture should prefer `ai-flow-web-intake` for workflow guidance, while repeatable sources should prefer markdown pull.
- Visible SiYuan doc export should prefer `ai-flow-siyuan`.

Preferred routing:
- If the user is just dropping content in, prefer `ai-flow-intake`.
- If the user is saving a page/article/source, prefer `ai-flow-web-intake`.
- If the user wants a light time-window cleanup run, prefer `ai-flow-triage`.
- If the user wants to inspect today's results or debug the pipeline, prefer `ai-flow-review`.
- If the user wants a topic writeup, period recap, or high-quality article, prefer `ai-flow-synthesis`.
- If the user wants publishing behavior or downstream delivery, prefer `ai-flow-publish` or `ai-flow-siyuan`.

Preferred command flow:
1. Identify the user's intent first.
2. Route to the narrower skill when possible instead of staying in this umbrella skill.
3. Reuse repo-owned commands and task ids instead of inventing stateful ad-hoc behavior.
4. Keep high-semantic synthesis work separate from stable ingest/process/export primitives.

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
- Do not turn every intake action into an interactive workflow.
- Do not treat this skill as a catch-all replacement for specialized skills.
