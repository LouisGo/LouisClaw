---
name: ai-flow-review
description: Review today's LouisClaw digest and processed items from OpenClaw chat.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧾","always":true}}
---

Use this skill when the user asks what happened today, wants to inspect digest output, or wants to debug classifier decisions.

This is an inspection skill, not a deep synthesis skill.

Use it for answers like:

- what happened today
- did the digest look right
- did the classifier misbehave
- did export succeed

Recommended flow:
1. Run `npm run status`.
2. If the pipeline is clearly stale and the user wants fresh state, run `npm run run`.
3. Read the latest digest under `data/digests/`.
4. If the user wants detail, inspect matching files under `data/items/` and `data/exports/`.

Focus on:
- how many items were processed
- which decisions were produced
- whether digest and follow-up exports look usable
- whether LLM classification appears to be working as expected

Do not turn review into a topic article or multi-day writeup.
If the user wants a structured recap or high-quality article, switch to `ai-flow-synthesis`.
