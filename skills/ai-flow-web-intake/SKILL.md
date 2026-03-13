---
name: ai-flow-web-intake
description: Capture web pages, articles, and recurring web-derived inputs into the LouisClaw workflow from OpenClaw chat.
user-invocable: true
metadata: {"openclaw":{"emoji":"🌐","always":true}}
---

Use this skill when the user wants to save a webpage, article, reading note, or recurring web-derived source into LouisClaw.

Preferred routes:

1. Quick one-off URL capture
   - Use `npm run web-intake -- --url "..." --title "..." --content "..."`
   - Put the cleaned summary, excerpt, or why-it-matters note into `--content`, not raw HTML.

2. Web page plus manual note
   - If the user wants both the link and a short takeaway, still prefer `npm run web-intake -- ...` with a concise note in `--content`.

3. Repeatable or scalable intake
   - If the source is something the user wants to keep pulling over time, prefer a synced local append-only markdown file plus `MARKDOWN_PULL_SOURCES`.
   - Then use `npm run task -- run pull_markdown_sources` and continue with `npm run task -- run process_inbox` or `npm run run`.

After capture:

1. Confirm whether the user wants intake only or wants the downstream pipeline to run.
2. If they want the full flow, prefer `npm run run`.
3. If they are debugging the intake boundary, prefer `npm run task -- run pull_markdown_sources` or `npm run task -- run process_inbox` explicitly.

Rules:

- Keep the workflow local-first.
- Skills may fetch or orchestrate, but durable persistence must still go through repo-owned commands and contracts.
- Do not invent direct notebook writes or machine-local-only storage behavior.
- Prefer append-only markdown pull when the same web source needs to be revisited over time.
