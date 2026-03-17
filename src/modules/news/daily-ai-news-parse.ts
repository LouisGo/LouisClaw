import { DailyAiNewsEntry } from "./daily-ai-news.service.js";
import { Candidate, CollectionEntry, RequestSpec } from "./daily-ai-news-collector.types.js";
import { findTrustedNewsSource } from "./source-policy.js";
import {
  cleanCandidateTitle,
  inferCandidateWhy,
  isAiRelevantCandidate,
  isWithinRequestWindow,
  normalizePublishedAt,
  scoreCandidate
} from "./daily-ai-news-select.js";

export function parseRssCandidates(xml: string, entry: CollectionEntry, request: RequestSpec): Candidate[] {
  const items = xml.includes("<item")
    ? Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => match[0])
    : Array.from(xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)).map((match) => match[0]);

  return items
    .map((block) => {
      const title = decodeHtml(extractTag(block, "title"));
      const link = decodeHtml(extractLink(block));
      const publishedAt = decodeHtml(extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated"));
      return normalizeCandidate({
        title,
        url: link,
        source: entry.label,
        region: entry.region,
        tier: entry.tier,
        publishedAt
      }, entry, request);
    })
    .filter((candidate): candidate is Candidate => Boolean(candidate));
}

export function parseEntryPageCandidates(html: string, entry: CollectionEntry, request: RequestSpec): Candidate[] {
  const anchors = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  const results: Candidate[] = [];
  const seen = new Set<string>();

  for (const anchor of anchors) {
    const rawHref = anchor[1];
    const rawTitle = normalizeWhitespace(stripTags(decodeHtml(anchor[2])));
    if (!rawHref || !rawTitle || rawTitle.length < 12) {
      continue;
    }

    const absoluteUrl = makeAbsoluteUrl(entry.entryUrl || `https://${entry.host}`, rawHref);
    if (!absoluteUrl || !matchesEntryPattern(entry.host, absoluteUrl)) {
      continue;
    }

    const key = `${entry.host}:${rawTitle.toLowerCase()}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    const candidate = normalizeCandidate({
      title: rawTitle,
      url: absoluteUrl,
      source: entry.label,
      region: entry.region,
      tier: entry.tier
    }, entry, request);

    if (candidate) {
      results.push(candidate);
    }
  }

  return results;
}

function normalizeCandidate(raw: Omit<DailyAiNewsEntry, "why"> & { publishedAt?: string }, entry: CollectionEntry, request: RequestSpec): Candidate | undefined {
  const title = cleanCandidateTitle(entry.host, normalizeWhitespace(raw.title));
  const url = raw.url?.trim();
  if (!title || !url) {
    return undefined;
  }

  const trusted = findTrustedNewsSource(url);
  if (!trusted) {
    return undefined;
  }

  if (!isAiRelevantCandidate(title, url, entry)) {
    return undefined;
  }

  if (!isWithinRequestWindow(raw.publishedAt, request)) {
    return undefined;
  }

  const normalizedKey = `${trusted.host}:${normalizeTitleKey(title)}`;
  const score = scoreCandidate(title, url, trusted.tier, trusted.region, raw.publishedAt);

  const titleLang = /[\u4e00-\u9fff]/.test(title) ? "zh" : "en";

  return {
    title,
    titleLang,
    titleZhStatus: titleLang === "en" ? "pending" : "not_needed",
    needsLlmEnrichment: titleLang === "en",
    url,
    source: raw.source || trusted.label,
    region: raw.region,
    tier: raw.tier,
    publishedAt: normalizePublishedAt(raw.publishedAt),
    why: inferCandidateWhy(title, raw.tier),
    normalizedKey,
    score
  };
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]?.trim() || "";
}

function extractLink(block: string): string {
  const atomLink = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>(?:<\/link>)?/i)?.[1];
  if (atomLink) {
    return atomLink.trim();
  }

  return extractTag(block, "link");
}

function makeAbsoluteUrl(baseUrl: string, rawHref: string): string | undefined {
  try {
    return new URL(rawHref, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function matchesEntryPattern(host: string, url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    if (host === "anthropic.com") {
      return /^\/news\/[a-z0-9-]+/.test(pathname);
    }
    if (host === "36kr.com") {
      return /^\/p\/\d+/.test(pathname);
    }
    if (host === "cls.cn") {
      return /^\/detail\/\d+/.test(pathname);
    }
    if (host === "yicai.com") {
      return /^\/news\//.test(pathname);
    }
    return pathname.length > 1;
  } catch {
    return false;
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ");
}

function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).slice(0, 10).join(" ");
}

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2019;/gi, "’")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(parseInt(num, 10)));
}
