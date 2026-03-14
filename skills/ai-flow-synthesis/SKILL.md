---
name: ai-flow-synthesis
description: Generate a high-quality topic writeup, period recap, or structured knowledge note from LouisClaw items.
user-invocable: true
metadata: {"openclaw":{"emoji":"🧠","always":true}}
---

Use this skill when the user wants more than a daily digest, such as a topic article, project recap, multi-day review, or structured note.

This skill owns high-semantic generation work.
It should build from repo data and existing outputs, not invent a parallel storage system.

This is the right place for requests like:

- do not give me a daily digest, give me a focused article
- review the last few days around one topic
- turn scattered notes into something worth keeping

Typical requests:

- summarize the last 3 days of AI-related inputs
- turn this topic into a clean article
- write a project-oriented recap from related items
- extract reusable methods or decisions from recent notes

Preferred flow:

1. Identify the scope: topic, project, tag, or time range
2. Inspect relevant digest and item outputs already present in the repo
3. If needed, run `npm run task -- run process_inbox` or `npm run task -- run build_digest` first
4. Produce a high-quality Markdown draft with:
   - a clear title
   - a short framing section
   - grouped insights instead of a raw list
   - explicit why-it-matters judgment
   - follow-up or next-action section when appropriate
   - links or references back to underlying items when useful
   - frontmatter aligned with `documents/synthesis-output-contract.md` when creating a durable artifact
5. If the user wants durable output, hand off to `ai-flow-publish` or `ai-flow-siyuan`

Rules:

- Do not treat a daily digest as the only final form
- Prefer synthesis over copy-paste aggregation
- Use stronger reasoning here than in intake/triage flows
- Default long-form destination is `SiYuan`, while `IM` should receive only light notification when needed
- Do not replace stable repo processing with made-up runtime-only state
- Prefer the durable artifact contract in `documents/synthesis-output-contract.md`
