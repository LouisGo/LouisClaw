import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { readTextFile, writeTextFile } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { Candidate, CollectionEntry, RequestSpec } from "./daily-ai-news-collector.types.js";
import { fetchNewsText } from "./daily-ai-news-fetch.js";
import { parseEntryPageCandidates, parseRssCandidates } from "./daily-ai-news-parse.js";
import {
  DailyAiNewsEntry,
  hasPendingDailyAiNewsEnrichment,
  renderDailyAiNewsPacketBody,
  toDailyAiNewsFrontmatterEntries
} from "./daily-ai-news.service.js";
import { buildConfidenceNote, selectCandidates } from "./daily-ai-news-select.js";

export interface DailyAiNewsCollectResult {
  packetPath?: string;
  requestPath?: string;
  count: number;
  officialCount: number;
  majorMediaCount: number;
  cnCount: number;
  skippedReason?: string;
}

export class DailyAiNewsCollector {
  constructor(private readonly config: AppConfig) {}

  async collectFromPendingRequest(requestPath: string): Promise<DailyAiNewsCollectResult> {
    const request = this.loadRequest(requestPath);
    const candidates = await this.collectCandidates(request);
    const selected = selectCandidates(candidates, request);

    if (!selected.length) {
      return {
        requestPath,
        count: 0,
        officialCount: 0,
        majorMediaCount: 0,
        cnCount: 0,
        skippedReason: "no_candidates_collected"
      };
    }

    this.writePacket(request, selected);
    this.markRequestCompleted(request);

    return {
      packetPath: request.outputPath,
      requestPath,
      count: selected.length,
      officialCount: selected.filter((entry) => entry.tier === "official").length,
      majorMediaCount: selected.filter((entry) => entry.tier === "major_media").length,
      cnCount: selected.filter((entry) => entry.region === "CN").length
    };
  }

  private loadRequest(requestPath: string): RequestSpec {
    const parsed = matter(readTextFile(requestPath));
    const data = parsed.data as Record<string, unknown>;
    const collectionEntries = Array.isArray(data.collection_entries)
      ? data.collection_entries.map((entry) => normalizeCollectionEntry(entry)).filter((entry): entry is CollectionEntry => Boolean(entry))
      : [];

    return {
      requestPath,
      outputPath: String(data.output_path || "").trim(),
      date: String(data.date || "").trim(),
      windowStart: String(data.window_start || "").trim(),
      windowEnd: String(data.window_end || "").trim(),
      targetCount: parsePositiveInt(data.target_count, this.config.aiNews.targetCount),
      maxCount: parsePositiveInt(data.max_count, this.config.aiNews.maxCount),
      targetCnCount: parseNonNegativeInt(data.target_cn_count, this.config.aiNews.targetCnCount),
      maxCnCount: parseNonNegativeInt(data.max_cn_count, this.config.aiNews.maxCnCount),
      officialMaxCount: parseNonNegativeInt(data.official_max_count, this.config.aiNews.officialMaxCount),
      majorMediaMinCount: parseNonNegativeInt(data.major_media_min_count, this.config.aiNews.majorMediaMinCount),
      collectionEntries
    };
  }

  private async collectCandidates(request: RequestSpec): Promise<Candidate[]> {
    const collected: Candidate[] = [];

    for (const entry of request.collectionEntries) {
      if (entry.rssUrl) {
        try {
          const xml = await fetchNewsText(entry.rssUrl);
          collected.push(...parseRssCandidates(xml, entry, request));
        } catch {
          // Ignore RSS fetch failures and continue to entry page fallback.
        }
      }

      if (entry.entryUrl) {
        try {
          const html = await fetchNewsText(entry.entryUrl);
          collected.push(...parseEntryPageCandidates(html, entry, request));
        } catch {
          // Ignore entry page fetch failures for this source.
        }
      }
    }

    const deduped = new Map<string, Candidate>();
    for (const candidate of collected) {
      const existing = deduped.get(candidate.normalizedKey);
      if (!existing || candidate.score > existing.score) {
        deduped.set(candidate.normalizedKey, candidate);
      }
    }

    return Array.from(deduped.values()).sort((left, right) => right.score - left.score);
  }

  private writePacket(request: RequestSpec, selected: Candidate[]): void {
    const entries = selected.map(stripCandidateMeta);
    const sourceUrls = Array.from(new Set(entries.map((entry) => entry.url)));
    const confidenceNote = buildConfidenceNote(selected, request);
    const body = renderDailyAiNewsPacketBody(request.date, entries);

    writeTextFile(request.outputPath, matter.stringify(body, {
      id: `daily_ai_news_packet:${request.date}`,
      artifact_type: "daily_ai_news_packet",
      created_at: nowIso(),
      created_by: "ai-flow-daily-ai-news-collector",
      status: "completed",
      enrichment_status: hasPendingDailyAiNewsEnrichment(entries) ? "pending" : "completed",
      enrichment_target: "english_titles_to_title_zh",
      date: request.date,
      window_start: request.windowStart,
      window_end: request.windowEnd,
      confidence_note: confidenceNote,
      source_urls: sourceUrls,
      news_entries: toDailyAiNewsFrontmatterEntries(entries)
    }));
  }

  private markRequestCompleted(request: RequestSpec): void {
    const parsed = matter(readTextFile(request.requestPath));
    const nextData = {
      ...parsed.data,
      status: "completed",
      completed_at: nowIso(),
      completed_output_path: request.outputPath
    };

    writeTextFile(request.requestPath, matter.stringify(parsed.content, nextData));
  }
}

function normalizeCollectionEntry(raw: unknown): CollectionEntry | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const entry = raw as Record<string, unknown>;
  const host = String(entry.host || "").trim();
  const label = String(entry.label || "").trim();
  const tier = String(entry.tier || "").trim().toLowerCase();
  const region = String(entry.region || "").trim().toUpperCase();

  if (!host || !label || (tier !== "official" && tier !== "major_media") || (region !== "CN" && region !== "US")) {
    return undefined;
  }

  return {
    host,
    label,
    tier,
    region,
    entryUrl: String(entry.entry_url || "").trim() || undefined,
    rssUrl: String(entry.rss_url || "").trim() || undefined
  };
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : fallback;
}

function stripCandidateMeta(candidate: Candidate): DailyAiNewsEntry {
  return {
    title: candidate.title,
    titleZh: candidate.titleZh,
    titleLang: candidate.titleLang,
    titleZhStatus: candidate.titleZhStatus,
    needsLlmEnrichment: candidate.needsLlmEnrichment,
    url: candidate.url,
    source: candidate.source,
    region: candidate.region,
    tier: candidate.tier,
    why: candidate.why,
    publishedAt: candidate.publishedAt
  };
}
