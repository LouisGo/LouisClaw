import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { fileExists, listFiles, readTextFile, writeTextFile } from "../../shared/fs.js";
import { dateStamp, formatLocalDateTime, nowIso, timezoneLabel } from "../../shared/time.js";
import { fileSlug } from "../../shared/text.js";
import { findTrustedNewsSource, listTrustedNewsCollectionEntries, listTrustedNewsSources, NewsRegion, NewsSourceTier, renderTrustedNewsPolicyMarkdown } from "./source-policy.js";

export interface DailyAiNewsEntry {
  title: string;
  titleZh?: string;
  titleLang?: "en" | "zh";
  titleZhStatus?: "pending" | "completed" | "not_needed";
  needsLlmEnrichment?: boolean;
  url: string;
  source: string;
  region: NewsRegion;
  tier: NewsSourceTier;
  why?: string;
  publishedAt?: string;
}

export interface DailyAiNewsPacket {
  filePath: string;
  date: string;
  windowStart: string;
  windowEnd: string;
  sourceUrls: string[];
  confidenceNote?: string;
  entries: DailyAiNewsEntry[];
}

export interface DailyAiNewsPrepareResult {
  requestPath?: string;
  outputPath?: string;
  windowStart: string;
  windowEnd: string;
  requestedCount: number;
  skippedReason?: string;
}

export class DailyAiNewsService {
  constructor(private readonly config: AppConfig) {}

  prepareDailyRequest(now: Date = new Date()): DailyAiNewsPrepareResult {
    const windowEnd = now.toISOString();
    const windowStart = new Date(now.getTime() - this.config.aiNews.windowHours * 60 * 60 * 1000).toISOString();

    if (!this.config.aiNews.enabled) {
      return {
        windowStart,
        windowEnd,
        requestedCount: this.config.aiNews.targetCount,
        skippedReason: "ai_news_disabled"
      };
    }

    const date = dateStamp(now);
    const outputPath = path.join(this.config.paths.newsPackets, `${date}-${fileSlug("daily-ai-news", "daily-ai-news")}.md`);
    const requestPath = path.join(this.config.paths.newsRequests, `${date}-${fileSlug("daily-ai-news-request", "daily-ai-news-request")}.md`);

    if (fileExists(outputPath)) {
      return {
        outputPath,
        windowStart,
        windowEnd,
        requestedCount: this.config.aiNews.targetCount,
        skippedReason: "packet_already_exists"
      };
    }

    const body = renderRequestBody(this.config, date, windowStart, windowEnd, outputPath);

    writeTextFile(requestPath, matter.stringify(body, {
      id: `daily_ai_news_request:${date}`,
      artifact_type: "daily_ai_news_request",
      created_at: nowIso(),
      created_by: "ai-flow-daily-ai-news-request",
      status: "pending",
      date,
      window_start: windowStart,
      window_end: windowEnd,
      target_count: this.config.aiNews.targetCount,
      max_count: this.config.aiNews.maxCount,
      target_cn_count: this.config.aiNews.targetCnCount,
      max_cn_count: this.config.aiNews.maxCnCount,
      official_max_count: this.config.aiNews.officialMaxCount,
      major_media_min_count: this.config.aiNews.majorMediaMinCount,
      output_path: outputPath,
      collection_mode: "fixed-feeds-and-whitelist-only",
      allowed_hosts: listTrustedNewsSources().map((entry) => entry.host),
      collection_entries: listTrustedNewsCollectionEntries().map((entry) => ({
        label: entry.label,
        host: entry.host,
        tier: entry.tier,
        region: entry.region,
        ...(entry.entryUrl ? { entry_url: entry.entryUrl } : {}),
        ...(entry.rssUrl ? { rss_url: entry.rssUrl } : {})
      }))
    }));

    return {
      requestPath,
      outputPath,
      windowStart,
      windowEnd,
      requestedCount: this.config.aiNews.targetCount
    };
  }

  latestPendingRequestPath(): string | undefined {
    const files = listFiles(this.config.paths.newsRequests, ".md");
    for (const filePath of files.reverse()) {
      const parsed = matter(readTextFile(filePath));
      if (parsed.data.status === "pending") {
        return filePath;
      }
    }

    return undefined;
  }

  latestNewsPacketPath(date: string = dateStamp()): string | undefined {
    const exactPath = path.join(this.config.paths.newsPackets, `${date}-${fileSlug("daily-ai-news", "daily-ai-news")}.md`);
    if (fileExists(exactPath)) {
      return exactPath;
    }

    const files = listFiles(this.config.paths.newsPackets, ".md");
    return files[files.length - 1];
  }

  latestPendingEnrichmentPacketPath(date: string = dateStamp()): string | undefined {
    const exactPath = this.latestNewsPacketPath(date);
    if (!exactPath) {
      return undefined;
    }

    const parsed = matter(readTextFile(exactPath));
    if (parsed.data.enrichment_status === "completed") {
      return undefined;
    }

    const rawEntries = Array.isArray(parsed.data.news_entries) ? parsed.data.news_entries : [];
    const hasPending = rawEntries.some((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      const candidate = entry as Record<string, unknown>;
      return candidate.title_zh_status === "pending" || candidate.needs_llm_enrichment === true;
    });

    return hasPending ? exactPath : undefined;
  }

  loadLatestPacket(date: string = dateStamp()): DailyAiNewsPacket | undefined {
    const filePath = this.latestNewsPacketPath(date);
    if (!filePath) {
      return undefined;
    }

    const parsed = matter(readTextFile(filePath));
    const entries = parseDailyAiNewsEntries(parsed.data.news_entries, parsed.content)
      .filter((entry) => findTrustedNewsSource(entry.url))
      .slice(0, this.config.aiNews.maxCount);

    if (!entries.length) {
      return undefined;
    }

    const sourceUrls = Array.from(new Set(entries.map((entry) => entry.url)));

    return {
      filePath,
      date: String(parsed.data.date || date),
      windowStart: String(parsed.data.window_start || ""),
      windowEnd: String(parsed.data.window_end || ""),
      sourceUrls,
      confidenceNote: typeof parsed.data.confidence_note === "string" ? parsed.data.confidence_note : undefined,
      entries
    };
  }
}

function renderRequestBody(config: AppConfig, date: string, windowStart: string, windowEnd: string, outputPath: string): string {
  return [
    `# Daily AI News Request｜${date}`,
    "",
    "## Goal",
    `输出 6-8 条优中选优的 AI 高质量信号，默认目标 ${config.aiNews.targetCount} 条，用于晨报固定栏目展示。重点不是资讯堆砌，而是高置信度、强判断价值、能反映真实行业脉搏与批评。`,
    "",
    "## Hard Boundaries",
    `- 时间窗口：${windowStart} ～ ${windowEnd}（展示时区：${timezoneLabel()}）。`,
    `- 条数：目标 ${config.aiNews.targetCount} 条，上限 ${config.aiNews.maxCount} 条；如果高质量候选不足，可以少于目标值，绝不凑数。`,
    `- 中文来源：目标 ${config.aiNews.targetCnCount} 条，上限 ${config.aiNews.maxCnCount} 条；中文来源只作为补充，不强行配额。`,
    `- 官方来源上限：${config.aiNews.officialMaxCount} 条；至少 ${config.aiNews.majorMediaMinCount} 条必须来自权威媒体或外部观察，避免整份内容变成品牌通稿。`,
    "- 采集方式：只允许使用 frontmatter collection_entries 里的固定新闻页 / RSS / 白名单入口，不做全网开放式搜索。",
    "- 只允许使用 request frontmatter allowlist 中的官方站点或权威媒体。",
    "- 如果同一事件存在官方源和媒体源，按更有信息增量者保留；若媒体提供了更关键的批评、风险或商业背景，可以优先媒体。",
    "- 如果同一事件有多个来源重复报道，只保留最权威、最有增量的一条。",
    "- 禁止自媒体、聚合站、转载站、内容农场、无法确认编辑责任的网站。",
    "- 只收 AI 相关重大新闻：模型发布、产品级落地、融资/财报、监管政策、芯片/算力、重大合作、并购、安全、版权、组织变化，以及能够反映真实争议或批评的行业观察。",
    "",
    renderTrustedNewsPolicyMarkdown(),
    "## Required Output",
    `- 输出 markdown 到：${outputPath}`,
    "- 必须包含 frontmatter 字段：date、window_start、window_end、confidence_note、news_entries。",
    "- collect 阶段只负责写原始标题，不做翻译。",
    "- news_entries 必须是对象数组，每项至少包含：title、title_lang、title_zh_status、needs_llm_enrichment、url、source、region(CN|US)、tier(official|major_media)、why、published_at。",
    "- 英文资源在 collect 阶段标记为 title_lang=en / title_zh_status=pending / needs_llm_enrichment=true，等待后续 LLM enrich 任务补 title_zh。",
    "- 中文资源标记为 title_lang=zh / title_zh_status=not_needed。",
    "- why 要写成一句高价值理由：为什么这条值得进早报，而不是普通新闻。",
    "- 正文再额外渲染一份列表，格式建议：1. [标题](链接)｜来源｜CN/US｜official/major_media｜为什么重要。",
    "- 完成后把 request frontmatter 的 status 改成 completed。",
    "",
    "## Selection Heuristic",
    "- 优先级一：事实硬度。官方公告、监管文件、财报、并购、权威媒体首发优先。",
    "- 优先级二：判断价值。能改变对行业方向、商业化、风险或竞争格局判断的新闻优先。",
    "- 优先级三：批评与现实约束。优先保留能反映真实问题、约束、争议、商业压力和落地难点的内容。",
    "- 最后做去重、官方占比控制、中文条数控制与整体收敛。",
    ""
  ].join("\n");
}

function parsePacketEntries(rawEntries: unknown, content: string): DailyAiNewsEntry[] {
  const frontmatterEntries = parseFrontmatterEntries(rawEntries);
  if (frontmatterEntries.length) {
    return frontmatterEntries;
  }

  return parseMarkdownEntries(content);
}

export function parseDailyAiNewsEntries(rawEntries: unknown, content: string): DailyAiNewsEntry[] {
  return parsePacketEntries(rawEntries, content);
}

export function hasPendingDailyAiNewsEnrichment(entries: DailyAiNewsEntry[]): boolean {
  return entries.some((entry) => entry.titleLang === "en" && (!entry.titleZh || entry.titleZhStatus === "pending" || entry.needsLlmEnrichment));
}

export function toDailyAiNewsFrontmatterEntries(entries: DailyAiNewsEntry[]): Array<Record<string, unknown>> {
  return entries.map((entry) => ({
    title: entry.title,
    ...(entry.titleZh ? { title_zh: entry.titleZh } : {}),
    title_lang: entry.titleLang,
    title_zh_status: entry.titleZhStatus,
    needs_llm_enrichment: entry.needsLlmEnrichment,
    url: entry.url,
    source: entry.source,
    region: entry.region,
    tier: entry.tier,
    ...(entry.why ? { why: entry.why } : {}),
    ...(entry.publishedAt ? { published_at: entry.publishedAt } : {})
  }));
}

export function renderDailyAiNewsPacketBody(date: string, entries: DailyAiNewsEntry[]): string {
  return [
    `# Daily AI News Packet｜${date}`,
    "",
    ...entries.map((entry, index) => {
      const displayTitle = entry.titleZh ? `${entry.title}（${entry.titleZh}）` : entry.title;
      return `${index + 1}. [${displayTitle}](${entry.url})｜${entry.source}｜${entry.region}｜${entry.tier}｜${entry.why || ""}`;
    }),
    ""
  ].join("\n");
}

function parseFrontmatterEntries(rawEntries: unknown): DailyAiNewsEntry[] {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  return rawEntries
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is DailyAiNewsEntry => Boolean(entry));
}

function parseMarkdownEntries(content: string): DailyAiNewsEntry[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(/^(?:-|\d+\.)\s+\[(.+?)\]\((https?:\/\/[^\s)]+)\)\s*[｜|]\s*([^｜|]+)\s*[｜|]\s*(CN|US)\s*[｜|]\s*(official|major_media)(?:\s*[｜|]\s*(.+))?$/i))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => normalizeEntry({
      title: match[1],
      url: match[2],
      source: match[3],
      region: match[4].toUpperCase(),
      tier: match[5].toLowerCase(),
      why: match[6]
    }))
    .filter((entry): entry is DailyAiNewsEntry => Boolean(entry));
}

function normalizeEntry(raw: unknown): DailyAiNewsEntry | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const candidate = raw as Record<string, unknown>;
  const title = String(candidate.title || "").trim();
  const url = String(candidate.url || "").trim();
  if (!title || !url) {
    return undefined;
  }

  const trusted = findTrustedNewsSource(url);
  if (!trusted) {
    return undefined;
  }

  const region = normalizeRegion(candidate.region) || trusted.region;
  const tier = normalizeTier(candidate.tier) || trusted.tier;

  const titleZh = String(candidate.title_zh || candidate.titleZh || "").trim() || undefined;
  const titleLang = normalizeTitleLang(candidate.title_lang) || inferTitleLang(title);
  const titleZhStatus = normalizeTitleZhStatus(candidate.title_zh_status)
    || (titleZh ? "completed" : titleLang === "en" ? "pending" : "not_needed");

  return {
    title,
    titleZh,
    titleLang,
    titleZhStatus,
    needsLlmEnrichment: candidate.needs_llm_enrichment === true || (titleLang === "en" && !titleZh),
    url,
    source: String(candidate.source || trusted.label).trim() || trusted.label,
    region,
    tier,
    why: String(candidate.why || "").trim() || undefined,
    publishedAt: String(candidate.published_at || candidate.publishedAt || "").trim() || undefined
  };
}

function inferTitleLang(title: string): "en" | "zh" {
  return /[\u4e00-\u9fff]/.test(title) ? "zh" : "en";
}

function normalizeTitleLang(value: unknown): "en" | "zh" | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "en" || normalized === "zh") {
    return normalized;
  }

  return undefined;
}

function normalizeTitleZhStatus(value: unknown): "pending" | "completed" | "not_needed" | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending" || normalized === "completed" || normalized === "not_needed") {
    return normalized;
  }

  return undefined;
}

function normalizeRegion(value: unknown): NewsRegion | undefined {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "CN" || normalized === "US") {
    return normalized;
  }

  return undefined;
}

function normalizeTier(value: unknown): NewsSourceTier | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "official" || normalized === "major_media") {
    return normalized;
  }

  return undefined;
}

export function renderDailyAiNewsSummary(packet: DailyAiNewsPacket): string[] {
  const cnCount = packet.entries.filter((entry) => entry.region === "CN").length;
  const usCount = packet.entries.filter((entry) => entry.region === "US").length;
  const lines = [`- 今日 AI 新闻已附 ${packet.entries.length} 条（CN ${cnCount} / US ${usCount}）。`];

  if (packet.windowStart && packet.windowEnd) {
    lines.push(`- 新闻窗口：${formatLocalDateTime(packet.windowStart)} ～ ${formatLocalDateTime(packet.windowEnd)}。`);
  }

  return lines;
}
