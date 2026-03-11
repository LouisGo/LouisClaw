export type ContentType = "text" | "link" | "image" | "code" | "mixed" | "video_link";

export type ItemStatus = "pending" | "processed" | "exported" | "summarized" | "dropped";

export type Decision = "drop" | "archive" | "digest" | "follow_up";

export interface IntakeInput {
  source: string;
  device: string;
  capture_time: string;
  content_type: ContentType;
  raw_content: string;
  url?: string;
  title?: string;
}

export interface SiYuanSyncState {
  exported: boolean;
  path?: string;
  updated_at?: string;
}

export interface Item {
  id: string;
  source: string;
  device: string;
  capture_time: string;
  content_type: ContentType;
  raw_content: string;
  normalized_content: string;
  url?: string;
  title?: string;
  tags: string[];
  topic?: string;
  status: ItemStatus;
  value_score: number;
  decision?: Decision;
  reason?: string;
  summary?: string;
  dedupe_key: string;
  duplicate_of?: string;
  siYuan_sync: SiYuanSyncState;
}

export interface DigestEntry {
  id: string;
  summary: string;
  reason: string;
  topic: string;
  decision: Decision;
  url?: string;
}
