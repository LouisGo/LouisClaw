# Standard task registry minimal slice

## Goal

Introduce a minimal standardized task layer so the same task id can be run manually now and scheduled later without changing the underlying implementation.

## Scope

Only implement:

1. A task registry with stable ids and lightweight metadata
2. A CLI entrypoint for `task list` and `task run <id>`
3. Mapping existing commands/modules to standardized task ids
4. Minimal docs so OpenClaw chat can call the new task ids consistently

## Task ids in this slice

- `status_overview`
- `process_inbox`
- `build_digest`
- `daily_pipeline`
- `export_siyuan`

## Design constraints

- Every task runner must delegate to existing command/module implementations
- No new scheduler in this slice
- No database or queue refactor
- No IM or SiYuan input integration work
- No change to processing logic beyond exposing existing capabilities through a registry

## Planned file changes

- `src/modules/tasks/task-registry.ts` (new)
  - define task ids, metadata, and runner functions
- `src/modules/tasks/task.command.ts` (new)
  - implement `task list` and `task run <id>`
- `src/app/cli.ts`
  - add `task` subcommands
- `package.json`
  - add `npm run task -- ...` convenience script
- `README.md`
  - add minimal section showing how to run standardized tasks
- `skills/ai-flow/SKILL.md`
  - steer chat/control-plane usage toward `npm run task -- run <task-id>` where appropriate

## Metadata shape

Each task should expose only minimal stable fields:

- `id`
- `description`
- `defaultSchedule`
- `dependsOn`
- `costClass`
- `run()`

## Verification

### Scenario A — registry and listing

- Tool: CLI
- Step 1: Run `npm run build`
- Step 2: Run `npm run task -- list`
- Expected:
  - build succeeds
  - output lists all defined task ids
  - each task shows description, default schedule hint, dependency summary, and cost class

### Scenario B — manual task execution uses existing implementation

- Tool: CLI
- Step 1: Run `npm run task -- run status_overview`
- Step 2: Run `npm run task -- run process_inbox`
- Expected:
  - `status_overview` prints the same status block as `npm run status`
  - `process_inbox` completes without breaking the landing/inbox boundary
  - no new implementation-specific output format is required beyond a small task preamble if added

### Scenario C — invalid task handling

- Tool: CLI
- Step 1: Run `npm run task -- run missing_task`
- Expected:
  - command exits with a clear error
  - output includes the missing task id and available task ids or a hint to use `task list`

### Scenario D — package script + OpenClaw manual trigger alignment

- Tools: CLI, OpenClaw webchat
- Step 1: Confirm `npm run task -- run status_overview` works locally
- Step 2: In OpenClaw webchat, open a new session and send `请直接运行 npm run task -- run status_overview，并用简洁中文总结结果。`
- Expected:
  - webchat executes the same package command, not a different ad-hoc path
  - the tool trace shows `npm run task -- run status_overview`
  - the assistant summarizes the result correctly in Chinese

### Scenario E — docs and skill guidance match the new task surface

- Tools: file read, OpenClaw webchat
- Step 1: Read updated `README.md` and `skills/ai-flow/SKILL.md`
- Step 2: Confirm they mention the standardized task command shape where relevant
- Expected:
  - docs and skill guidance do not contradict the existing command flow
  - OpenClaw can reasonably prefer standardized task ids for manual execution of common workflow tasks
