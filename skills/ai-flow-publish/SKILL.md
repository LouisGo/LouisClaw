---
name: ai-flow-publish
description: Decide how LouisClaw outputs should be published to SiYuan, local exports, or lightweight notifications.
user-invocable: true
metadata: {"openclaw":{"emoji":"🚚","always":true}}
---

Use this skill when the content already exists or has just been generated and the main question is where and how to publish it.

This skill decides delivery semantics, not content generation strategy.

Publishing surfaces:

- `SiYuan`: durable visible knowledge docs
- `data/exports/`: local markdown artifacts and attachments
- future `IM`: title or short reminder, not the main long-form store

Current concrete support:

- strongest: `SiYuan` export through `ai-flow-siyuan`
- stable local retention: repo-local Markdown under `data/exports/`
- future-facing only: `IM` title or reminder delivery

Preferred rules:

1. Long-form knowledge output should prefer `SiYuan`
2. Daily digests may exist both locally and in `SiYuan`
3. `IM` should usually receive a title, short note, or pointer, not the full article
4. Repo-local exports remain useful even when `SiYuan` publish is enabled
5. If no artifact exists yet, switch back to `ai-flow-synthesis` or another producer skill first
6. Prefer the artifact contract in `documents/synthesis-output-contract.md`

Preferred flow:

1. Confirm what artifact is being published: digest, follow-up, topic article, or recap
2. Choose the surface that matches the artifact
3. If the target is `SiYuan`, switch to `ai-flow-siyuan`
4. Tell the user what was published where, and what they should expect to see

Do not decide content-generation strategy here.
This skill is for delivery semantics, not for writing the article itself.
