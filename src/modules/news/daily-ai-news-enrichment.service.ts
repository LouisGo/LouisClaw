import matter from "gray-matter";
import { z } from "zod";
import { AppConfig } from "../../app/config.js";
import { readTextFile, writeTextFile } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import {
  DailyAiNewsEntry,
  DailyAiNewsService,
  hasPendingDailyAiNewsEnrichment,
  parseDailyAiNewsEntries,
  renderDailyAiNewsPacketBody,
  toDailyAiNewsFrontmatterEntries
} from "./daily-ai-news.service.js";

const translationSchema = z.object({
  translations: z.array(z.object({
    index: z.number().int().nonnegative(),
    title_zh: z.string().min(1)
  }))
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface PendingTranslation {
  index: number;
  title: string;
  source: string;
  why?: string;
}

export interface DailyAiNewsEnrichResult {
  packetPath?: string;
  translatedCount: number;
  pendingCount: number;
  completed: boolean;
  skippedReason?: string;
}

export class DailyAiNewsEnrichmentService {
  constructor(private readonly config: AppConfig) {}

  isEnabled(): boolean {
    return Boolean(this.config.ai.apiKey && this.config.ai.model);
  }

  async enrichLatestPendingPacket(): Promise<DailyAiNewsEnrichResult> {
    const packetPath = new DailyAiNewsService(this.config).latestPendingEnrichmentPacketPath();
    if (!packetPath) {
      return {
        translatedCount: 0,
        pendingCount: 0,
        completed: true,
        skippedReason: "no_pending_packet"
      };
    }

    return this.enrichPacket(packetPath);
  }

  async enrichPacket(packetPath: string): Promise<DailyAiNewsEnrichResult> {
    const parsed = matter(readTextFile(packetPath));
    const entries = parseDailyAiNewsEntries(parsed.data.news_entries, parsed.content);
    const pending = entries
      .map((entry, index) => ({ entry, index }))
      .filter(({ entry }) => entry.titleLang === "en" && (!entry.titleZh || entry.titleZhStatus === "pending" || entry.needsLlmEnrichment))
      .map(({ entry, index }) => ({
        index,
        title: entry.title,
        source: entry.source,
        why: entry.why
      }));

    if (!pending.length) {
      if (parsed.data.enrichment_status !== "completed") {
        this.writePacket(packetPath, String(parsed.data.date || ""), entries, parsed.data);
      }
      return {
        packetPath,
        translatedCount: 0,
        pendingCount: 0,
        completed: true,
        skippedReason: "no_pending_titles"
      };
    }

    if (!this.isEnabled()) {
      return {
        packetPath,
        translatedCount: 0,
        pendingCount: pending.length,
        completed: false,
        skippedReason: "llm_not_configured"
      };
    }

    const translations = await this.translateBatch(pending);
    let translatedCount = 0;
    const updated = entries.map((entry, index) => {
      const translation = translations.get(index);
      if (!translation) {
        return entry;
      }

      translatedCount += 1;
      return {
        ...entry,
        titleZh: translation,
        titleZhStatus: "completed" as const,
        needsLlmEnrichment: false
      };
    });

    const completed = !hasPendingDailyAiNewsEnrichment(updated);
    this.writePacket(packetPath, String(parsed.data.date || ""), updated, parsed.data, completed ? nowIso() : undefined);

    return {
      packetPath,
      translatedCount,
      pendingCount: pending.length,
      completed
    };
  }

  private async translateBatch(pending: PendingTranslation[]): Promise<Map<number, string>> {
    const response = await fetch(`${this.config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.ai.apiKey as string}`
      },
      body: JSON.stringify({
        model: this.config.ai.model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content: "Translate English AI-news headlines into concise natural Chinese. Preserve names, legal/regulatory meaning, and factual tone. Return JSON only: {\"translations\":[{\"index\":0,\"title_zh\":\"...\"}]}"
          },
          {
            role: "user",
            content: JSON.stringify({ items: pending }, null, 2)
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Daily AI news enrich failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Daily AI news enrich returned empty content");
    }

    const parsed = translationSchema.parse(JSON.parse(extractJson(content)));
    return new Map(parsed.translations.map((entry) => [entry.index, entry.title_zh.trim()]));
  }

  private writePacket(
    packetPath: string,
    date: string,
    entries: DailyAiNewsEntry[],
    data: Record<string, unknown>,
    enrichedAt?: string
  ): void {
    const completed = !hasPendingDailyAiNewsEnrichment(entries);
    const nextData: Record<string, unknown> = {
      ...data,
      news_entries: toDailyAiNewsFrontmatterEntries(entries),
      enrichment_status: completed ? "completed" : "pending"
    };

    if (completed) {
      nextData.enriched_at = enrichedAt || String(data.enriched_at || nowIso());
    }

    const body = renderDailyAiNewsPacketBody(date, entries);
    writeTextFile(packetPath, matter.stringify(body, nextData));
  }
}

function extractJson(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) {
    return fenced[1].trim();
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("No JSON object found in model response");
}
