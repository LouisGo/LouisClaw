# Minimal local landing phase-2 slice

## Goal

Strengthen the next-stage unified inbox architecture with the smallest local-first change.

## Scope

Only implement two tightly related intake improvements:

1. Support plain `.txt` files in `data/inbox/`
2. Support `ai-flow add --file <path>` as an alternative to `--content`

## Why this slice

- It advances the next-phase local landing path without touching IM or SiYuan input.
- It preserves `data/inbox` as the canonical ingress boundary.
- It matches current docs, which already mention `watch inbox` and CLI file-based add examples.
- It reuses the existing `process` / `watch` / digest pipeline unchanged.

## Planned file changes

- `src/app/cli.ts`
  - Make `add` accept `--content` or `--file`
- `src/modules/intake/add.command.ts`
  - Read file content when `--file` is provided
  - Validate that exactly one of `--content` / `--file` is used
  - Default title from file basename when helpful
- `src/modules/intake/inbox-file.service.ts`
  - Add `.txt` parsing with safe local defaults
- `src/modules/process/process.command.ts`
  - Include `.txt` inbox files in the processing scan
- `README.md`
  - Update examples and inbox format notes to match actual behavior

## Non-goals

- No new runtime or webhook
- No IM integration
- No SiYuan import/sync
- No change to classifier, digest, export, or item schema

## Verification

### Scenario A — `add --file` path

1. Run `npm run build`
2. Run `npm run add -- --type text --file README.md --source manual --device local`
3. Confirm a new inbox `.json` file is created under `data/inbox/`
4. Confirm the new inbox record contains `raw_content` copied from `README.md`
5. Run `npm run process`
6. Confirm the inbox file is removed, a raw snapshot is created in `data/raw/`, and a structured item is created in `data/items/`

### Scenario B — invalid flag combinations

1. Run `npm run add -- --type text --content "hello" --file README.md`
2. Confirm the command fails with a clear validation error
3. Run `npm run add -- --type text`
4. Confirm the command fails because neither `--content` nor `--file` was provided

### Scenario C — plain `.txt` inbox landing

1. Create a sample `.txt` file under `data/inbox/`
2. Run `npm run process`
3. Confirm the `.txt` file is accepted and removed from `data/inbox/`
4. Confirm the resulting raw/item records are created with safe defaults for local manual landing
5. Run `npm run status` and confirm the pipeline remains in a healthy, readable state
