---
name: ai-flow-feedback
description: Record lightweight user feedback about LouisClaw outputs so future filtering and review can improve.
user-invocable: true
metadata: {"openclaw":{"emoji":"🪴","always":true}}
---

Use this skill when the user says a result was useful, not useful, should appear more often, or should appear less often.

Supported feedback types:

- useful
- not useful
- more like this
- less like this

What this skill should do:

1. Identify the target output or topic when possible
2. Record the feedback in a repo-friendly way
3. Keep the feedback lightweight and explainable

Typical targets:

- a digest item
- a follow-up item
- a topic cluster
- a synthesized article or recap

Rules:

- Do not promise full preference learning if the repo does not yet support it
- Prefer explicit, auditable feedback records over hidden runtime memory
- If no stable feedback storage exists yet, create a clear interim note instead of pretending the system learned it automatically
- Prefer the contract in `documents/feedback-contract.md`
