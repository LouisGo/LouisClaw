---
name: ai-flow-intake
description: Capture a new personal information item into the LouisClaw inbox from OpenClaw chat.
user-invocable: true
metadata: {"openclaw":{"emoji":"📥","always":true}}
---

Use this skill when the user wants to quickly drop a link, note, code snippet, or idea into the inbox.

If the user is dealing with article/page/web research workflows that need more structured follow-through, use `ai-flow-web-intake` instead.

When the content is clear enough, use:

`npm run add -- --type <text|link|code|image|mixed|video_link> --content "..." --source openclaw --device webchat [--url "..."] [--title "..."]`

Defaults:
- `source`: `openclaw`
- `device`: `webchat`
- Use `text` unless the content is clearly a link, code, image note, mixed note, or video link.

After capture:
1. Confirm the inbox record path.
2. Ask whether to stop at intake or continue with `npm run run`.

Do not overcomplicate capture. Fast intake beats perfect metadata.
