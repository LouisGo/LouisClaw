import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { readJsonFile, writeJsonFile } from "../../shared/fs.js";

export interface MorningTopicReportState {
  localDate: string;
  updatedAt: string;
  title?: string;
  filePath?: string;
  itemCount: number;
  newsCount: number;
  sourceType?: "subscription" | "system";
  skippedReason?: string;
  error?: string;
}

export interface NightlySummaryReportState {
  localDate: string;
  updatedAt: string;
  digestPath?: string;
  digestAttachmentPath?: string;
  itemExportCount: number;
  siyuanSynced: boolean;
  error?: string;
}

export function loadMorningTopicReportState(config: AppConfig): MorningTopicReportState | undefined {
  return readJsonFile<MorningTopicReportState>(path.join(config.paths.state, "morning-topic-report.json"));
}

export function saveMorningTopicReportState(config: AppConfig, state: MorningTopicReportState): void {
  writeJsonFile(path.join(config.paths.state, "morning-topic-report.json"), state);
}

export function loadNightlySummaryReportState(config: AppConfig): NightlySummaryReportState | undefined {
  return readJsonFile<NightlySummaryReportState>(path.join(config.paths.state, "nightly-summary-report.json"));
}

export function saveNightlySummaryReportState(config: AppConfig, state: NightlySummaryReportState): void {
  writeJsonFile(path.join(config.paths.state, "nightly-summary-report.json"), state);
}
