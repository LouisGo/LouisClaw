# LouisClaw

Personal information-flow pipeline scaffold for local-first capture, digesting, export, and incremental SiYuan archiving.

## Structure

- `src/app/`: CLI and app-level config
- `src/domain/`: core item model
- `src/modules/intake/`: inbox intake and `add` command
- `src/modules/process/`: preprocess and classify flow
- `src/modules/digest/`: daily digest generation
- `src/modules/export/`: IM-friendly `.md` attachment export
- `src/modules/siyuan/`: incremental SiYuan export only
- `src/modules/watch/`: inbox file watching
- `src/infra/storage/`: item/state repositories
- `src/shared/`: filesystem, text, hash, time, logging helpers

## Commands

- `npm install`
- `npm run build`
- `npm run dev -- add --type text --content "hello"`
- `npm run add -- --type text --content "hello" --source mac --device macbook`
- `npm run watch`
- `npm run process`
- `npm run digest`
- `npm run run`
- `npm run status`
- `npm run export:siyuan`

## Inbox templates

- `templates/inbox/item.template.md`: suitable for manual capture and later editing
- `templates/inbox/item.template.json`: suitable for scripts, shortcuts, and automation
- `data/inbox/` now accepts both `.md` and `.json`

Markdown inbox files use frontmatter for metadata and the body as `raw_content`.

## Example flow

```bash
npm run add -- --type text --content "研究一下如何把长消息改成简介加 markdown 附件" --source mac --device macbook
npm run process
npm run digest
```

If you later enable SiYuan export:

```bash
ENABLE_SIYUAN_EXPORT=true SIYUAN_EXPORT_ROOT="/path/to/AI-Flow" npm run export:siyuan
```

If you want real LLM classification:

```bash
CLASSIFIER_MODE=llm AI_API_KEY="..." AI_MODEL="gpt-5.4" npm run process
```

OpenAI-compatible fallback env names also work:

```bash
CLASSIFIER_MODE=llm OPENAI_API_KEY="..." OPENAI_MODEL="gpt-5.4" npm run process
```

Recommended default is:

```bash
CLASSIFIER_MODE=auto
```

This uses LLM classification when configured, and falls back to the local heuristic classifier otherwise.

## OpenClaw

This repo can be used directly as an OpenClaw workspace.

Recommended local setup:

```bash
openclaw setup --non-interactive --mode local --workspace "/Users/louistation/MySpace/Life/LouisClaw"
openclaw config set gateway.mode local
openclaw config set agents.defaults.workspace "/Users/louistation/MySpace/Life/LouisClaw"
openclaw models set openai/gpt-5.4
```

Then provide your own API key in OpenClaw config or shell env, start the gateway, and use WebChat for debugging:

```bash
openclaw gateway --port 18789
openclaw dashboard
```

If your shell exposes `OPENAI_API_KEY`, the LouisClaw classifier now reuses it automatically.

Workspace skills are available under `skills/`:

- `ai-flow`: operate the whole pipeline from chat
- `ai-flow-intake`: quickly capture a new item into the inbox
- `ai-flow-review`: inspect today's digest and processed items

Reusable setup docs:

- `documents/OpenClaw快速启动说明.md`
- `templates/openclaw/openclaw.local.example.json`

## Data directories

- `data/inbox/`: intake files
- `data/raw/`: raw snapshots
- `data/items/`: structured items
- `data/digests/`: generated digests
- `data/exports/`: IM-friendly markdown exports
- `data/state/`: indexes and sync state
- `data/logs/`: run logs

## Notes

- SiYuan integration is incremental-only.
- IM attachments never go into SiYuan directories.
- `npm run watch` uses `chokidar` to process new inbox files.
- CLI parsing uses `commander`, validation uses `zod`, env loading uses `dotenv`.
