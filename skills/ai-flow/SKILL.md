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
- Intake happens through `data/inbox/` or `npm run add -- ...`.
- Processing writes structured items into `data/items/`.
- Daily digest output is written into `data/digests/` and mirrored into `data/exports/`.

Preferred command flow:
1. Check current state with `npm run status`.
2. Add a test item with `npm run add -- --type text --content "..." --source openclaw --device webchat` when the user wants to simulate intake.
3. Run `npm run run` to process inbox and refresh digest exports.
4. Read the latest files in `data/digests/` or `data/exports/` and summarize them for the user.

Rules:
- Keep the workflow local-first.
- Do not introduce IM bot integration unless the user explicitly asks.
- Never write to any SiYuan directory except a dedicated incremental export root.
- Prefer existing commands over custom scripts.
