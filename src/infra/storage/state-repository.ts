import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { readJsonFile, writeJsonFile } from "../../shared/fs.js";

export interface DedupeIndex {
  [dedupeKey: string]: string;
}

export interface SiYuanMap {
  [itemId: string]: SiYuanMapEntry;
}

export interface SiYuanMapEntry {
  mode?: "filesystem" | "api";
  notebookId?: string;
  docId?: string;
  path: string;
}

export interface MarkdownSourceStateEntry {
  size: number;
  mtimeMs: number;
  contentHash: string;
  lastImportedAt?: string;
}

export interface MarkdownSourceState {
  [sourcePath: string]: MarkdownSourceStateEntry;
}

export interface SiYuanInboxStateEntry {
  notebookId: string;
  notebookName: string;
  hPath: string;
  docId: string;
  contentHash: string;
  contentLength: number;
  contentSnapshot: string;
  lastSeenAt: string;
  lastImportedAt?: string;
}

export interface SiYuanInboxState {
  [sourceKey: string]: SiYuanInboxStateEntry;
}

export type TaskRunStatus = "running" | "success" | "failed";

export interface TaskRunStateEntry {
  taskId: string;
  status: TaskRunStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface TaskRunState {
  [taskId: string]: TaskRunStateEntry;
}

export class StateRepository {
  constructor(private readonly config: AppConfig) {}

  loadDedupeIndex(): DedupeIndex {
    return readJsonFile<DedupeIndex>(path.join(this.config.paths.state, "dedupe-index.json")) || {};
  }

  saveDedupeIndex(index: DedupeIndex): void {
    writeJsonFile(path.join(this.config.paths.state, "dedupe-index.json"), index);
  }

  loadSiYuanMap(): SiYuanMap {
    const raw = readJsonFile<Record<string, string | SiYuanMapEntry>>(path.join(this.config.paths.state, "siyuan-map.json")) || {};

    return Object.fromEntries(Object.entries(raw).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, { mode: "filesystem", path: value } satisfies SiYuanMapEntry];
      }

      return [key, value];
    }));
  }

  saveSiYuanMap(map: SiYuanMap): void {
    writeJsonFile(path.join(this.config.paths.state, "siyuan-map.json"), map);
  }

  loadMarkdownSourceState(): MarkdownSourceState {
    return readJsonFile<MarkdownSourceState>(path.join(this.config.paths.state, "markdown-source-state.json")) || {};
  }

  saveMarkdownSourceState(state: MarkdownSourceState): void {
    writeJsonFile(path.join(this.config.paths.state, "markdown-source-state.json"), state);
  }

  loadSiYuanInboxState(): SiYuanInboxState {
    return readJsonFile<SiYuanInboxState>(path.join(this.config.paths.state, "siyuan-inbox-state.json")) || {};
  }

  saveSiYuanInboxState(state: SiYuanInboxState): void {
    writeJsonFile(path.join(this.config.paths.state, "siyuan-inbox-state.json"), state);
  }

  loadTaskRunState(): TaskRunState {
    return readJsonFile<TaskRunState>(path.join(this.config.paths.state, "task-run-state.json")) || {};
  }

  saveTaskRunState(state: TaskRunState): void {
    writeJsonFile(path.join(this.config.paths.state, "task-run-state.json"), state);
  }
}
