import { DailyAiNewsEntry } from "./daily-ai-news.service.js";
import { NewsRegion, NewsSourceTier } from "./source-policy.js";

export interface CollectionEntry {
  label: string;
  host: string;
  tier: NewsSourceTier;
  region: NewsRegion;
  entryUrl?: string;
  rssUrl?: string;
}

export interface RequestSpec {
  requestPath: string;
  outputPath: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  targetCount: number;
  maxCount: number;
  targetCnCount: number;
  maxCnCount: number;
  officialMaxCount: number;
  majorMediaMinCount: number;
  collectionEntries: CollectionEntry[];
}

export interface Candidate extends DailyAiNewsEntry {
  score: number;
  normalizedKey: string;
}
