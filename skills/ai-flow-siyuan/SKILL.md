---
name: ai-flow-siyuan
description: Export LouisClaw digest and items into visible SiYuan docs through the official API.
user-invocable: true
metadata: {"openclaw":{"emoji":"📚","always":true}}
---

Use this skill when the user wants LouisClaw outputs to appear as visible SiYuan docs instead of filesystem-only markdown artifacts.

What this skill is for:

1. Check whether the current workspace already has digest/item outputs worth exporting
2. Run the existing LouisClaw pipeline when needed
3. Export those outputs into the dedicated SiYuan notebook via the official API
4. Verify the created docs by notebook/path, not by guessing from the filesystem

Preferred flow:

1. Inspect state first with `npm run task -- run status_overview`
2. If the user just captured a new item, finish the local loop first:
   - `npm run task -- run process_inbox`
   - `npm run task -- run build_digest` or `npm run task -- run daily_pipeline`
3. Export to visible SiYuan docs with API mode:
   - `ENABLE_SIYUAN_EXPORT=true SIYUAN_EXPORT_DRIVER=api SIYUAN_API_URL="http://127.0.0.1:6806" SIYUAN_API_TOKEN="..." SIYUAN_API_NOTEBOOK="AI-Flow" SIYUAN_EXPORT_VALIDATE=true npm run task -- run export_siyuan`
4. Tell the user what should now appear inside the `AI-Flow` notebook

What this skill should say clearly:

- LouisClaw repo remains the source of truth
- SiYuan is a downstream consumption surface
- API mode creates visible docs in SiYuan's tree
- Filesystem mode is still available, but it does not guarantee tree-visible docs

Rules:

- Use a dedicated notebook such as `AI-Flow`
- Do not write directly to `.sy` files
- Do not treat SiYuan as canonical state
- If API export is not configured, explain exactly what env vars are missing instead of pretending export succeeded
