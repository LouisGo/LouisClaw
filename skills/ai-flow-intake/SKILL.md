---
name: ai-flow-intake
description: Capture a new personal information item into the LouisClaw inbox from OpenClaw chat.
user-invocable: true
metadata: {"openclaw":{"emoji":"📥","always":true}}
---

Use this skill when the user wants to quickly drop a link, note, code snippet, idea, or other small input into the pipeline with minimal friction.

If the user is dealing with article/page/web research workflows that need more structured follow-through, use `ai-flow-web-intake` instead.

Default product behavior:

- Most intake is `silent capture`.
- Unless the user explicitly asks for processing, do not run the full downstream pipeline.
- A short confirmation is enough after successful capture.

When the content is clear enough, use:

`npm run add -- --type <text|link|code|image|mixed|video_link> --content "..." --source openclaw --device webchat [--url "..."] [--title "..."]`

Defaults:
- `source`: `openclaw`
- `device`: `webchat`
- Use `text` unless the content is clearly a link, code, image note, mixed note, or video link.

After capture:
1. Confirm the landing record path.
2. Stop by default.
3. Only continue into processing if the user explicitly asked for triage, digest, synthesis, or export.

Do not overcomplicate capture. Fast intake beats perfect metadata.
Do not turn basic capture into a long interview.
