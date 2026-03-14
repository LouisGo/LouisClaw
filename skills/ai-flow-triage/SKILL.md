---
name: ai-flow-triage
description: Run low-cost hourly-style triage on recent LouisClaw inputs and report what changed.
user-invocable: true
metadata: {"openclaw":{"emoji":"⏱️","always":true}}
---

Use this skill when the user wants a light cleanup or time-window review of recent inputs, not a long article.

This skill is the low-cost hourly-style cutoff layer.
It should help the user understand what entered the system recently without escalating into deep synthesis.

What this skill is for:

1. Process recent landing/inbox content
2. Apply the existing low-cost preprocess and classify flow
3. Tell the user what happened in a compact way

Preferred flow:

1. Inspect current state with `npm run task -- run status_overview`
2. If markdown pull sources are relevant, run `npm run task -- run pull_markdown_sources`
3. Run `npm run task -- run process_inbox`
4. Summarize the light results:
   - what arrived
   - which topics showed up
   - which items became `digest`
   - which items became `follow_up`
   - whether obvious duplicates/noise were filtered

Default behavior:

- Keep the result short
- Prefer low-cost processing
- Do not generate a long synthesis article
- Do not publish to `SiYuan` unless the user explicitly asks

Typical output shape:

- 1 short headline for the recent window
- a compact list of main topics
- notable `digest` candidates
- notable `follow_up` candidates
- any obvious duplicate/noise observation

Use this skill instead of `ai-flow-review` when the user wants a fresh light run, not just inspection.
