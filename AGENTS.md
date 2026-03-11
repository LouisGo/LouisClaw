## Workspace Purpose

This workspace is a personal information-flow pipeline for Louis.
Primary goal: compress fragmented multi-device inputs into a few high-value outputs.

## Operating Rules

- Preserve the local-first workflow.
- Treat this repo as the source of truth for intake, processing, digest, export, and OpenClaw integration.
- Prefer existing npm scripts and CLI commands before adding ad-hoc one-off scripts.
- Never modify existing SiYuan notebooks or folders.
- Only write SiYuan output into a dedicated incremental root such as `AI-Flow/`.
- Keep IM-style markdown attachments outside SiYuan.

## OpenClaw Usage

- This repo is intended to be used as an OpenClaw agent workspace.
- Prefer these commands when operating the pipeline:
  - `npm run build`
  - `npm run add -- --type text --content "..."`
  - `npm run process`
  - `npm run digest`
  - `npm run run`
  - `npm run status`
- Read `README.md` before making structural changes.

## Safety

- Do not introduce IM bot integration unless explicitly requested.
- Do not move persistent exports into external systems unless explicitly requested.
- Keep changes minimal and aligned with the repo structure.
