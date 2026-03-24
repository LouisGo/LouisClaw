# LouisClaw

Personal information-flow pipeline scaffold for local-first capture, digesting, export, and SiYuan-facing consumption.

## Structure

- `src/app/`: CLI and app-level config
- `src/domain/`: core item model
- `src/modules/intake/`: inbox intake and `add` command
- `src/modules/process/`: preprocess and classify flow
- `src/modules/digest/`: daily digest generation
- `src/modules/export/`: IM-friendly `.md` attachment export
- `src/modules/siyuan/`: filesystem and API-backed SiYuan export adapters
- `src/modules/watch/`: inbox file watching
- `src/infra/storage/`: item/state repositories
- `src/shared/`: filesystem, text, hash, time, logging helpers

## Commands

- `npm install`
- `npm run build`
- `npm run dev -- add --type text --content "hello"`
- `npm run add -- --type text --content "hello" --source mac --device macbook`
- `npm run web-intake -- --url "https://example.com" --title "Example" --content "short takeaway"`
- `npm run add -- --type code --file ./snippet.ts --source mac --device macbook`
- `npm run watch`
- `npm run process`
- `npm run digest`
- `npm run run`
- `npm run status`
- `npm run task -- list`
- `npm run task -- run status_overview`
- `npm run schedule -- list`
- `npm run export:siyuan`

## Inbox templates

- `templates/inbox/item.template.md`: suitable for manual capture and later editing
- `templates/inbox/item.template.json`: suitable for scripts, shortcuts, and automation
- `data/landing/` is the local drop-zone for external/manual inputs
- `data/inbox/` is the internal normalized processing queue and accepts `.md`, `.json`, and `.txt`

Markdown inbox files use frontmatter for metadata and the body as `raw_content`.

Plain `.txt` inbox files are treated as local manual text captures with safe defaults (`source=manual`, `device=local`, `content_type=text`).

`npm run add` now lands new records in `data/landing/`, and the existing watch/process flow moves supported files into `data/inbox/` before processing.

`data/landing/` currently accepts only `.json`, `.md`, and `.txt`. Unsupported files are left in place and logged as ignored.

## Example flow

```bash
npm run add -- --type text --content "研究一下如何把长消息改成简介加 markdown 附件" --source mac --device macbook
npm run add -- --type code --file ./snippet.ts --source mac --device macbook
npm run process
npm run digest
```

## Standard tasks

Use standardized task ids when you want manual execution and future scheduling to share the same underlying implementation.

```bash
npm run task -- list
npm run task -- run status_overview
npm run task -- run process_inbox
npm run task -- run pull_siyuan_inbox
npm run task -- run pull_markdown_sources
npm run task -- run prepare_external_research
npm run task -- run collect_external_research
npm run task -- run build_morning_topic
npm run task -- run nightly_summary
npm run task -- run build_digest
npm run task -- run daily_pipeline
```

Current built-in task ids:

- `pull_markdown_sources`
- `pull_siyuan_inbox`
- `status_overview`
- `process_inbox`
- `prepare_daily_ai_news`
- `collect_daily_ai_news`
- `enrich_daily_ai_news`
- `prepare_external_research`
- `collect_external_research`
- `build_morning_topic`
- `report_morning_topic`
- `build_digest`
- `nightly_summary`
- `report_nightly_summary`
- `daily_pipeline`
- `export_siyuan`

## Standard schedules

Use schedules when you want OpenClaw cron to trigger the same standardized task ids automatically.

```bash
npm run schedule -- list
npm run schedule -- install hourly_process_inbox
npm run schedule -- install hourly_process_inbox --every 2h
npm run schedule -- install morning_external_research_request
npm run schedule -- install morning_external_research_collect
npm run schedule -- install morning_topic_push
npm run schedule -- install nightly_summary_push
```

Current built-in schedule ids:

- `hourly_process_inbox` -> `process_inbox`
- `hourly_pull_markdown_sources` -> `pull_markdown_sources`
- `hourly_pull_siyuan_inbox` -> `pull_siyuan_inbox`
- `morning_daily_ai_news_request` -> `prepare_daily_ai_news`
- `morning_daily_ai_news_collect` -> `collect_daily_ai_news`
- `morning_daily_ai_news_enrich` -> `enrich_daily_ai_news`
- `morning_external_research_request` -> `prepare_external_research`
- `morning_external_research_collect` -> `collect_external_research`
- `morning_topic_build` -> `build_morning_topic`
- `morning_topic_push` -> `report_morning_topic`
- `nightly_summary_build` -> `nightly_summary`
- `nightly_summary_push` -> `report_nightly_summary`

The schedule layer is thin on purpose: it installs or updates OpenClaw cron jobs that tell the agent to run `npm run task -- run <task-id>`.

`npm run status` now also shows the latest recorded run result for `pull_markdown_sources`, `pull_siyuan_inbox`, `process_inbox`, `build_morning_topic`, `nightly_summary`, and `daily_pipeline`, plus current OpenClaw schedule install/enabled state when available.

## Output rhythm

LouisClaw now distinguishes passive background work from active reading outputs:

- `07:00-01:59`: passive intake / processing runs quietly in the background
- `02:00-06:59`: quiet hours, no hourly pull/process work
- `08:00`: one `晨间专题`, intended for `30-60` minutes of focused reading
- `23:00`: one `每日总结`, intended to close the day

File names stay ASCII-safe and sortable. Human-friendly titles and exact timestamps live in the markdown body and frontmatter instead of the filename.

## Markdown source pull

You can configure one or more local markdown files to be polled and landed into `data/landing/`.

推荐契约：

- 使用单独根目录：`mock-sources/markdown/` 或未来真实同步目录
- 每个逻辑来源只对应一个稳定的 `.md` 文件
- 推荐文件名使用稳定的小写 kebab-case 或常见语义名，如：`inbox.md`、`quick-notes.md`、`reading-notes.md`
- V1 只适合 append-only 追加，不适合频繁改写历史内容

Set `MARKDOWN_PULL_SOURCES` to a JSON array. Example:

```bash
MARKDOWN_PULL_SOURCES='[
  {"path":"./documents/inbox.md","source":"markdown_pull","device":"local","title":"Inbox Note"}
]'
```

推荐把它写进项目根目录的 `.env`，这样 OpenClaw cron 与手动执行会共用同一份配置。

仓库里已经提供了一个可直接测试的 mock 契约：

- `mock-sources/markdown/inbox.md`
- `mock-sources/markdown/quick-notes.md`
- `mock-sources/markdown/reading-notes.md`

如果你使用仓库默认 `.env`，这些 mock 文件会直接作为 markdown pull 的输入源。

Then run:

```bash
npm run task -- run pull_markdown_sources
```

V1 behavior:

- first run only seeds source state and does not import historical content
- later runs import appended suffix content only
- in-place rewrites are skipped in v1

## SiYuan inbox pull

If you want LouisClaw to poll a fixed SiYuan doc like `iNBox` through the official API, configure:

```bash
SIYUAN_API_URL="http://127.0.0.1:6806"
SIYUAN_API_TOKEN="..."
SIYUAN_INBOX_NOTEBOOK="Your Notebook"
SIYUAN_INBOX_HPATH="/Inbox/iNBox"
```

Optional metadata overrides:

```bash
SIYUAN_INBOX_TITLE="iNBox"
SIYUAN_INBOX_SOURCE="siyuan_inbox"
SIYUAN_INBOX_DEVICE="siyuan"
```

Then run:

```bash
npm run task -- run pull_siyuan_inbox
```

V1 behavior:

- uses the official SiYuan API `getIDsByHPath` + `exportMdContent`
- first run only seeds source state and does not import historical content
- later runs import appended suffix content only
- in-place rewrites are skipped in v1

默认调度顺序：

- `hourly_pull_markdown_sources`: 每小时 `:00`，但 `02:00-06:59` 静默
- `hourly_pull_siyuan_inbox`: 每小时 `:02`，但 `02:00-06:59` 静默
- `hourly_process_inbox`: 每小时 `:05`，但 `02:00-06:59` 静默
- `morning_daily_ai_news_request`: 每天 `07:08`（Asia/Shanghai，默认不安装）
- `morning_daily_ai_news_collect`: 每天 `07:18`（Asia/Shanghai，默认不安装）
- `morning_daily_ai_news_enrich`: 每天 `07:26`（Asia/Shanghai，默认不安装）
- `morning_topic_build`: 每天 `08:00`（Asia/Shanghai，本地产物生成）
- `morning_topic_push`: 每天 `08:02`（Asia/Shanghai，读取现成结果后推送）
- `nightly_summary_build`: 每天 `23:00`（Asia/Shanghai，本地产物生成）
- `nightly_summary_push`: 每天 `23:02`（Asia/Shanghai，读取现成结果后推送）

## Daily AI news module

Morning topic now supports an additional fixed section: `今日 AI 重磅新闻`.

Behavior:

- keeps the report `local-first`
- splits the workflow into deterministic collection and later LLM enrichment
- collector only uses fixed high-quality feeds / RSS / whitelist entry pages instead of broad web search
- collector marks English headlines as pending enrichment instead of translating in Node
- enrich layer fills `title_zh` later while preserving the original title and fact fields
- defaults to `6` items, caps at `8`, and keeps Chinese coverage to `1-2` items
- intentionally reserves room for external critique / risk / commercial-reality signals instead of only official announcements

Recommended env knobs:

```bash
AI_NEWS_ENABLED=true
AI_NEWS_TARGET_COUNT=6
AI_NEWS_MAX_COUNT=8
AI_NEWS_TARGET_CN=1
AI_NEWS_MAX_CN=2
AI_NEWS_OFFICIAL_MAX=3
AI_NEWS_MAJOR_MEDIA_MIN=2
AI_NEWS_WINDOW_HOURS=24
```

Generated artifacts:

- request: `data/news/requests/YYYY-MM-DD-daily-ai-news-request.md`
- packet: `data/news/packets/YYYY-MM-DD-daily-ai-news.md`

The collector now runs inside this repo with a narrow scope: fixed RSS feeds and whitelist entry pages only. It does not do broad web search, and selection is constrained by the request file plus trusted-source policy.

## Morning topic subscriptions

If you want the 08:00 report to prefer your explicitly chosen themes, configure:

```bash
MORNING_TOPIC_SUBSCRIPTIONS="消息渲染优化,AI 工作流,信息流分层"
MORNING_TOPIC_LOOKBACK_DAYS=7
```

Current v1 behavior:

- local-first: it uses recent local items first
- if no subscription matches, it falls back to the strongest recent emergent topic
- generated files are written into `data/exports/synthesis/`
- if SiYuan export is enabled, the morning topic is exported there too

## Bounded external research

If you want OpenClaw to supplement a morning topic with public web sources, keep it bounded:

```bash
EXTERNAL_RESEARCH_ENABLED=false
EXTERNAL_RESEARCH_MAX_SOURCES=6
EXTERNAL_RESEARCH_MIN_LOCAL_ITEMS=3
ACTIVE_ITEM_MAX_AGE_DAYS=30
MORNING_TOPIC_MAX_ITEMS=8
OPENCLAW_CONTEXT_MAX_ITEMS=12
OPENCLAW_CONTEXT_MAX_PACKETS=1
OPENCLAW_CONTEXT_MAX_DIGESTS=1
FEISHU_PUSH_TARGET="chat:oc_xxx"
```

Recommended operating model:

- default stays `false`
- LouisClaw first checks whether local topic materials are already sufficient
- only when local material is below threshold does it prepare one bounded request in `data/research/requests/`
- only then should OpenClaw fulfill that request and write one packet into `data/research/packets/`

Important boundaries:

- only for subscribed morning topics
- no open-ended browsing
- no always-on crawling
- no more than the configured source cap
- research schedules exist but are not installed by default

Practical default limits:

- active items older than `30` days do not participate in active morning-topic selection
- each morning topic uses at most `8` local items
- OpenClaw active tasks should think in terms of at most `12` item summaries, `1` research packet, and `1` digest
- if you want scheduled pushes to reach Feishu reliably, set an explicit `FEISHU_PUSH_TARGET` instead of relying on `channel=last`

Reference: `documents/external-research-boundary.md`

If you later enable SiYuan export:

```bash
ENABLE_SIYUAN_EXPORT=true SIYUAN_EXPORT_ROOT="/path/to/AI-Flow" npm run export:siyuan
```

If you want visible SiYuan docs through the official API instead of filesystem-only markdown export:

```bash
ENABLE_SIYUAN_EXPORT=true SIYUAN_EXPORT_DRIVER=api SIYUAN_API_URL="http://127.0.0.1:6806" SIYUAN_API_TOKEN="..." SIYUAN_API_NOTEBOOK="AI-Flow" npm run export:siyuan
```

This creates visible docs under a dedicated SiYuan notebook such as `AI-Flow`, while LouisClaw remains the source of truth.

Recommended `AI-Flow` notebook structure:

- `/digests/`: daily digest docs
- `/items/`: exported `digest` items worth surfacing
- `/follow-ups/`: exported `follow_up` items that imply action or revisit

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
- `ai-flow-triage`: run light hourly-style triage on recent inputs
- `ai-flow-web-intake`: guide webpage/article intake into the existing local-first workflow
- `ai-flow-synthesis`: generate higher-value topic recaps and structured writeups
- `ai-flow-publish`: choose where outputs should be published
- `ai-flow-feedback`: record lightweight output feedback
- `ai-flow-siyuan`: export LouisClaw outputs into visible SiYuan docs via the official API
- `ai-flow-review`: inspect today's digest and processed items

Reusable setup docs:

- `documents/OpenClaw快速启动说明.md`
- `templates/openclaw/openclaw.local.example.json`

Workflow notes:

- `documents/web-intake-contract.md`
- `documents/siyuan-api-memo.md`
- `documents/feedback-contract.md`
- `documents/synthesis-output-contract.md`
- `documents/markdown-rendering-contract.md`
- `documents/IM-BOT接入准备清单.md`

For one-off webpage/article capture, prefer:

```bash
npm run web-intake -- --url "https://example.com/article" --title "Article title" --content "cleaned summary or excerpt"
```

This still lands into `data/landing/` through the standard intake contract. Then continue with `npm run task -- run process_inbox` or `npm run run`.

## Data directories

- `data/inbox/`: intake files
- `data/landing/`: local landing files waiting to enter inbox
- `data/raw/`: raw snapshots
- `data/items/`: structured items
- `data/digests/`: generated digests
- `data/exports/`: IM-friendly markdown exports
- `data/exports/synthesis/`: draft long-form synthesis artifacts before publish
- `data/feedback/`: lightweight user feedback records
- `data/state/`: indexes and sync state
- `data/logs/`: run logs

## Notes

- SiYuan integration is incremental-only.
- IM attachments never go into SiYuan directories.
- `npm run watch` uses `chokidar` to move supported files from `data/landing/` into `data/inbox/`, then process inbox files.
- CLI parsing uses `commander`, validation uses `zod`, env loading uses `dotenv`.
