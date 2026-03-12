import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { readJsonFile, writeJsonFile } from "../../shared/fs.js";

export interface DedupeIndex {
  [dedupeKey: string]: string;
}

export interface SiYuanMap {
  [itemId: string]: string;
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

export class StateRepository {
  constructor(private readonly config: AppConfig) {}

  loadDedupeIndex(): DedupeIndex {
    return readJsonFile<DedupeIndex>(path.join(this.config.paths.state, "dedupe-index.json")) || {};
  }

  saveDedupeIndex(index: DedupeIndex): void {
    writeJsonFile(path.join(this.config.paths.state, "dedupe-index.json"), index);
  }

  loadSiYuanMap(): SiYuanMap {
    return readJsonFile<SiYuanMap>(path.join(this.config.paths.state, "siyuan-map.json")) || {};
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
}
