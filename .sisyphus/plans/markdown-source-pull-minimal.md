# Markdown source pull minimal slice

## Goal

Add a reusable local markdown source pull capability that reads configured markdown files, detects cheap append-only changes, and writes normalized intake records into `data/landing`.

## Scope

Only implement:

1. Config for one or more markdown source file paths
2. State tracking for cheap no-op detection and append-only import
3. A pull service that writes `.json` landing records
4. A standardized task id for manual and future scheduled execution
5. Minimal docs for setup and verification

## Non-goals

- No IM integration
- No SiYuan-specific parser
- No markdown AST parsing
- No direct writes to `inbox`
- No scheduler redesign
- No rewrite-diff import support in v1

## V1 behavior

- First run seeds source state only and does not import historical content
- Later runs import only appended suffix content
- In-place rewrites update state but do not import content
- Empty suffixes are ignored

## Planned file changes

- `src/app/config.ts`
  - add optional markdown source config
- `src/infra/storage/state-repository.ts`
  - add markdown source state load/save
- `src/modules/intake/markdown-source-pull.service.ts` (new)
  - poll files, detect append-only changes, write landing JSON
- `src/modules/intake/pull-markdown.command.ts` (new)
  - thin command wrapper for the service
- `src/modules/tasks/task-registry.ts`
  - add `pull_markdown_sources`
- `src/modules/tasks/task-schedule-registry.ts`
  - add `hourly_pull_markdown_sources`
- `README.md`
  - document config and task/schedule usage

## State shape

Store per-source state in `data/state/markdown-source-state.json` keyed by absolute path:

- `size`
- `mtimeMs`
- `contentHash`
- `lastImportedAt`

## Verification

### Scenario A — seed only

- Tool: CLI
- Step 1: Configure one sample markdown source file
- Step 2: Run `npm run task -- run pull_markdown_sources`
- Expected:
  - state file is created
  - no landing record is created on first run

### Scenario B — append import

- Tool: CLI
- Step 1: Append text to the configured markdown file
- Step 2: Run `npm run task -- run pull_markdown_sources`
- Expected:
  - exactly one new landing `.json` record is created
  - record source metadata identifies markdown pull

### Scenario C — unchanged file

- Tool: CLI
- Step 1: Run `npm run task -- run pull_markdown_sources` again without editing the file
- Expected:
  - no new landing record is created

### Scenario D — rewrite skip

- Tool: CLI
- Step 1: Replace the markdown file content instead of appending
- Step 2: Run `npm run task -- run pull_markdown_sources`
- Expected:
  - state updates
  - no landing record is created in v1

### Scenario E — downstream reuse

- Tool: CLI
- Step 1: After Scenario B, run `npm run task -- run process_inbox`
- Expected:
  - the landing record is processed through the existing pipeline unchanged
