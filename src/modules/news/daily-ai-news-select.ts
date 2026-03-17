import { Candidate, CollectionEntry, RequestSpec } from "./daily-ai-news-collector.types.js";
import { NewsRegion, NewsSourceTier } from "./source-policy.js";

const AI_KEYWORDS = [
  "ai", "artificial intelligence", "model", "models", "llm", "chatgpt", "claude", "grok", "gemini", "copilot", "xai", "openai", "anthropic", "nvidia", "agent", "agents", "generative", "seedance", "kimi",
  "人工智能", "大模型", "模型", "生成式", "智能体", "豆包", "千问", "悟空"
];

const HIGH_SIGNAL_KEYWORDS = [
  "lawsuit", "sues", "suing", "presses", "probe", "investigation", "classified", "security", "risk", "warning", "copyright", "policy", "regulation", "layoffs", "pause", "critic",
  "诉讼", "起诉", "监管", "调查", "版权", "安全", "风险", "警告", "暂停", "裁员", "争议", "批评"
];

const IMPACT_KEYWORDS = [
  "agent", "api", "model", "partner", "acquire", "acquisition", "enterprise", "platform", "chip", "infrastructure", "release", "launch", "grok", "chatgpt", "claude", "gemini", "xai", "openai", "anthropic",
  "智能体", "大模型", "模型", "发布", "企业级", "平台", "芯片", "并购", "合作", "基础设施", "悟空"
];

const CLICKBAIT_PENALTY_KEYWORDS = [
  "刷屏", "暴论", "亲自点赞", "狂飙", "命悬一线", "彻夜难眠", "终极", "神图", "宣判", "降临", "万字演讲",
  "watch", "how to", "biggest problem", "so far"
];

const CLICKBAIT_REJECT_KEYWORDS = [
  "头疼", "狂飙", "命悬一线", "彻夜难眠", "炸裂", "惊呆", "疯传", "刷屏"
];

export function selectCandidates(candidates: Candidate[], request: RequestSpec): Candidate[] {
  const selected: Candidate[] = [];
  const usedKeys = new Set<string>();
  const sourceCounts = new Map<string, number>();

  const cnCandidates = candidates.filter((candidate) => candidate.region === "CN");
  const mediaCandidates = candidates.filter((candidate) => candidate.tier === "major_media");

  for (const candidate of cnCandidates) {
    if (selected.filter((item) => item.region === "CN").length >= request.targetCnCount) {
      break;
    }
    addCandidate(selected, usedKeys, sourceCounts, candidate, request);
  }

  for (const candidate of mediaCandidates) {
    if (selected.filter((item) => item.tier === "major_media").length >= request.majorMediaMinCount) {
      break;
    }
    addCandidate(selected, usedKeys, sourceCounts, candidate, request);
  }

  for (const candidate of candidates) {
    if (selected.length >= request.targetCount) {
      break;
    }
    addCandidate(selected, usedKeys, sourceCounts, candidate, request);
  }

  return selected.sort((left, right) => right.score - left.score);
}

export function inferCandidateWhy(title: string, tier: NewsSourceTier): string {
  const normalized = title.toLowerCase();

  if (containsKeyword(normalized, ["lawsuit", "sues", "copyright", "诉讼", "起诉", "版权"])) {
    return "这类诉讼或版权争议比普通功能发布更能影响生成式 AI 的长期商业边界。";
  }

  if (containsKeyword(normalized, ["presses", "probe", "policy", "regulation", "classified", "监管", "调查", "政策", "安全"])) {
    return "这条反映的是监管、安全或政治约束，对行业现实边界比单纯产品更新更重要。";
  }

  if (containsKeyword(normalized, ["agent", "api", "platform", "enterprise", "平台", "企业级"])) {
    return "它不是普通资讯，而是能反映 AI 正在从模型能力走向工作流、平台化或企业落地的信号。";
  }

  if (tier === "major_media") {
    return "相比官方通稿，这条更有外部观察和现实约束价值，能补足行业判断。";
  }

  return "这条不是简单热闹消息，而是对 AI 竞争格局、商业化或能力边界有判断价值的信号。";
}

export function buildConfidenceNote(selected: Candidate[], request: RequestSpec): string {
  const officialCount = selected.filter((entry) => entry.tier === "official").length;
  const mediaCount = selected.filter((entry) => entry.tier === "major_media").length;
  const cnCount = selected.filter((entry) => entry.region === "CN").length;

  return `本次新闻包由固定白名单入口自动收集并筛选：总数 ${selected.length} 条（目标 ${request.targetCount} / 上限 ${request.maxCount}），官方源 ${officialCount} 条、外部媒体 ${mediaCount} 条、中文 ${cnCount} 条。采集范围严格限制在 request 的 RSS 与固定新闻页入口内，不做全网开放式搜索；选取时优先保留能反映监管、诉讼、风险、商业压力或真实落地约束的新闻，而不是单纯产品喜报。`;
}

export function isAiRelevantCandidate(title: string, url: string, entry: CollectionEntry): boolean {
  const normalized = `${title.toLowerCase()} ${url.toLowerCase()}`;

  if (containsKeyword(normalized, ["openclaw", "nanoclaw", "clawd"])) {
    return false;
  }

  if (entry.tier === "major_media" && containsKeyword(normalized, CLICKBAIT_REJECT_KEYWORDS)) {
    return false;
  }

  if (containsKeyword(normalized, AI_KEYWORDS)) {
    return true;
  }

  return isAiNativeOfficialHost(entry.host);
}

export function scoreCandidate(title: string, url: string, tier: NewsSourceTier, region: NewsRegion, publishedAt?: string): number {
  let score = tier === "major_media" ? 58 : 54;
  const normalized = `${title.toLowerCase()} ${url.toLowerCase()}`;

  if (containsKeyword(normalized, HIGH_SIGNAL_KEYWORDS)) {
    score += 26;
  }

  if (containsKeyword(normalized, IMPACT_KEYWORDS)) {
    score += 18;
  }

  if (containsKeyword(normalized, ["partnership", "partnering", "合作伙伴", "生态伙伴"])) {
    score -= 8;
  }

  if (containsKeyword(normalized, ["security", "safety", "安全"])) {
    score += 6;
  }

  if (containsKeyword(normalized, CLICKBAIT_PENALTY_KEYWORDS)) {
    score -= 22;
  }

  if (region === "CN") {
    score += 4;
  }

  const publishedTime = parseDateMaybe(publishedAt);
  if (publishedTime) {
    const ageHours = Math.max(0, (Date.now() - publishedTime.getTime()) / (60 * 60 * 1000));
    score += Math.max(0, 16 - ageHours);
  }

  return Math.round(score);
}

export function cleanCandidateTitle(host: string, title: string): string {
  let cleaned = title;

  if (host === "anthropic.com") {
    cleaned = cleaned
      .replace(/^(?:Announcements?|News|Policy)\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+/, "")
      .replace(/^[A-Z][a-z]{2}\s+\d{1,2},\s+\d{4}\s+[A-Za-z]+\s+/, "")
      .replace(/\s+A statement from our CEO[\s\S]*$/i, "")
      .replace(/\s+Our response to[\s\S]*$/i, "");
  }

  return cleaned.replace(/^\d+\.\s*/, "").trim();
}

export function normalizePublishedAt(value: string | undefined): string | undefined {
  const date = parseDateMaybe(value);
  return date ? date.toISOString() : value || undefined;
}

export function isWithinRequestWindow(publishedAt: string | undefined, request: RequestSpec): boolean {
  if (!publishedAt) {
    return true;
  }

  const published = parseDateMaybe(publishedAt);
  const windowStart = parseDateMaybe(request.windowStart);
  const windowEnd = parseDateMaybe(request.windowEnd);
  if (!published || !windowStart || !windowEnd) {
    return true;
  }

  return published >= windowStart && published <= windowEnd;
}

export function parseDateMaybe(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const numericMatch = value.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (!numericMatch) {
    return undefined;
  }

  const fallback = new Date(numericMatch[1]);
  return Number.isNaN(fallback.getTime()) ? undefined : fallback;
}

function addCandidate(
  selected: Candidate[],
  usedKeys: Set<string>,
  sourceCounts: Map<string, number>,
  candidate: Candidate,
  request: RequestSpec
): void {
  if (usedKeys.has(candidate.normalizedKey)) {
    return;
  }

  const cnCount = selected.filter((item) => item.region === "CN").length;
  const officialCount = selected.filter((item) => item.tier === "official").length;
  const perSourceCount = sourceCounts.get(candidate.source) || 0;

  if (candidate.region === "CN" && cnCount >= request.maxCnCount) {
    return;
  }

  if (candidate.tier === "official" && officialCount >= request.officialMaxCount) {
    return;
  }

  if (perSourceCount >= 2) {
    return;
  }

  selected.push(candidate);
  usedKeys.add(candidate.normalizedKey);
  sourceCounts.set(candidate.source, perSourceCount + 1);
}

function containsKeyword(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(keyword));
}

function isAiNativeOfficialHost(host: string): boolean {
  return ["openai.com", "anthropic.com", "deepmind.google"].includes(host);
}
