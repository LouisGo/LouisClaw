import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { listFiles, readTextFile, writeTextFile } from "../../shared/fs.js";
import { dateStamp, formatLocalDateTime, formatLocalTime, nowIso, timezoneLabel } from "../../shared/time.js";
import { fileSlug } from "../../shared/text.js";

interface TopicCandidate {
  label: string;
  slug: string;
  items: Item[];
  sourceType: "subscription" | "system";
  whyNow: string;
  researchPacket?: ResearchPacket;
}

interface ResearchPacket {
  filePath: string;
  topicLabel: string;
  sourceUrls: string[];
  confidenceNote?: string;
  conclusion?: string;
  findings: string[];
}

export interface MorningTopicBuildResult {
  filePath?: string;
  title?: string;
  itemCount: number;
  sourceType?: "subscription" | "system";
  skippedReason?: string;
}

export class MorningTopicService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository
  ) {}

  build(): MorningTopicBuildResult {
    const items = this.loadRecentItems();
    if (!items.length) {
      return {
        itemCount: 0,
        skippedReason: "no_recent_items"
      };
    }

    const candidate = this.selectCandidate(items);
    if (!candidate) {
      return {
        itemCount: 0,
        skippedReason: "no_topic_candidate"
      };
    }

    const today = dateStamp();
    const title = `晨间专题｜${candidate.label}`;
    const body = renderMorningTopic(today, candidate, this.config.morningTopic.lookbackDays);
    const fileName = `${today}-morning-topic-${fileSlug(candidate.label, candidate.slug || "topic")}.md`;
    const filePath = path.join(this.config.paths.exportSynthesis, fileName);

    writeTextFile(filePath, matter.stringify(body, {
      id: `synthesis:${path.basename(fileName, ".md")}`,
      artifact_type: "morning_topic",
      title,
      created_at: nowIso(),
      created_by: "ai-flow-morning-topic",
      scope_type: candidate.sourceType === "subscription" ? "subscribed_topic" : "emergent_topic",
      scope_ref: candidate.slug,
      source_item_ids: candidate.items.map((item) => item.id),
      publish_status: "draft",
      source_policy: candidate.researchPacket ? "local-plus-web" : "local-first"
    }));

    return {
      filePath,
      title,
      itemCount: candidate.items.length,
      sourceType: candidate.sourceType
    };
  }

  private loadRecentItems(): Item[] {
    const lookbackMs = this.config.morningTopic.lookbackDays * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - lookbackMs;

    return this.itemRepository.loadAll()
      .filter((item) => item.decision && item.decision !== "drop")
      .filter((item) => Date.parse(item.capture_time) >= cutoff)
      .sort((left, right) => {
        const scoreDelta = (right.value_score || 0) - (left.value_score || 0);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return (right.capture_time || "").localeCompare(left.capture_time || "");
      });
  }

  private selectCandidate(items: Item[]): TopicCandidate | undefined {
    const subscriptionCandidate = this.selectSubscriptionCandidate(items);
    if (subscriptionCandidate) {
      return subscriptionCandidate;
    }

    return this.selectSystemCandidate(items);
  }

  private selectSubscriptionCandidate(items: Item[]): TopicCandidate | undefined {
    const subscriptions = this.config.morningTopic.subscriptions;
    const candidates = subscriptions.map((label) => {
      const matched = items.filter((item) => matchesTopic(item, label)).slice(0, 8);
      const researchPacket = this.findResearchPacket(label);
      return {
        label,
        slug: fileSlug(label, "topic"),
        items: matched,
        sourceType: "subscription" as const,
        whyNow: researchPacket
          ? `你已订阅这个主题；当前本地材料较少，所以这次由受限外部研究补足背景，再生成晨间专题。`
          : `你已订阅这个主题，最近 ${matched.length} 条材料已经足够支撑一轮 30-60 分钟的晨间深读。`,
        researchPacket
      };
    }).filter((candidate) => candidate.items.length > 0 || candidate.researchPacket);

    return candidates.sort((left, right) => scoreCandidate(right) - scoreCandidate(left))[0];
  }

  private selectSystemCandidate(items: Item[]): TopicCandidate | undefined {
    const groups = new Map<string, Item[]>();
    for (const item of items) {
      const label = normalizeSystemLabel(item.topic || item.title || "general");
      const group = groups.get(label) || [];
      group.push(item);
      groups.set(label, group);
    }

    const candidates = Array.from(groups.entries())
      .map(([label, groupItems]) => ({
        label,
        slug: fileSlug(label, "topic"),
        items: groupItems.slice(0, 8),
        sourceType: "system" as const,
        whyNow: `这个主题最近连续出现 ${groupItems.length} 次，已经从零散输入长成值得早晨专注阅读的主题。`
      }))
      .filter((candidate) => candidate.items.length > 0)
      .sort((left, right) => scoreCandidate(right) - scoreCandidate(left));

    return candidates[0];
  }

  private findResearchPacket(label: string): ResearchPacket | undefined {
    const normalizedLabel = label.toLowerCase();
    const files = listFiles(this.config.paths.researchPackets, ".md");
    for (const filePath of files.reverse()) {
      const parsed = matter(readTextFile(filePath));
      const topicLabel = String(parsed.data.topic_label || "").trim();
      if (topicLabel.toLowerCase() !== normalizedLabel) {
        continue;
      }

      return {
        filePath,
        topicLabel,
        sourceUrls: Array.isArray(parsed.data.source_urls) ? parsed.data.source_urls.map(String) : [],
        confidenceNote: typeof parsed.data.confidence_note === "string" ? parsed.data.confidence_note : undefined,
        ...parseResearchPacketBody(parsed.content)
      };
    }

    return undefined;
  }
}

function renderMorningTopic(date: string, candidate: TopicCandidate, lookbackDays: number): string {
  const sortedByTime = [...candidate.items].sort((left, right) => (left.capture_time || "").localeCompare(right.capture_time || ""));
  const followUps = candidate.items.filter((item) => item.decision === "follow_up");
  const digests = candidate.items.filter((item) => item.decision === "digest");
  const rawSignals = sortedByTime.map((item) => `- ${formatLocalDateTime(item.capture_time)}｜${summarizeItem(item)}${renderReason(item)}`);
  const keyPoints = deriveKeyPoints(candidate.items, candidate.label, candidate.researchPacket);
  const nextSteps = deriveNextSteps(candidate.items, candidate.label);
  const readingMinutes = estimateReadingMinutes(candidate.items, candidate.researchPacket);
  const localMaterialsNote = candidate.items.length >= 3
    ? "这篇专题当前主要建立在本地沉淀之上，已经足够形成一轮有判断的阅读。"
    : candidate.researchPacket
      ? "这篇专题当前主要由受限外部资料补足背景，后续如果你继续投递自己的案例、困惑和实践记录，下一轮会更贴近你的个人处境。"
      : "这篇专题当前仍以本地零散材料为主；如果你后续希望把它做成更完整的研究稿，下一轮可以补充公开资料。";

  return [
    `# 晨间专题｜${candidate.label}`,
    "",
    `> 生成时间：${formatLocalDateTime(new Date())} (${timezoneLabel()})`,
    `> 推荐阅读时长：约 ${readingMinutes} 分钟`,
    `> 选题来源：${candidate.sourceType === "subscription" ? "你的订阅主题" : "系统识别的近期高频主题"}`,
    `> 材料窗口：近 ${lookbackDays} 天，本地材料 ${candidate.items.length} 条`,
    ...(candidate.researchPacket ? [`> 外部补充：已接入受限 research packet（${candidate.researchPacket.sourceUrls.length} 个来源）`] : []),
    "",
    "## 为什么今天读这个",
    candidate.whyNow,
    "",
    "## 关键信号",
    ...keyPoints.map((point) => `- ${point}`),
    "",
    ...(rawSignals.length ? [`## 时间线（按发生顺序，精确到秒）`, ...rawSignals, ""] : []),
    "## 当前判断",
    ...renderCurrentJudgment(candidate.label, candidate.items.length, followUps.length, digests.length, Boolean(candidate.researchPacket)),
    ...(candidate.researchPacket?.confidenceNote ? [`- 外部资料置信说明：${candidate.researchPacket.confidenceNote}`] : []),
    "",
    "## 建议你今天带着什么问题读",
    ...nextSteps.map((step) => `- ${step}`),
    "",
    "## 材料边界",
    `- ${localMaterialsNote}`,
    `- 当前策略是 local-first：优先用你的 iNBox、思源和历史沉淀出稿；只有当本地信息不足时，才补少量公开资料。`,
    `- 如果你之后点名这个主题要继续深入，我会把它升级成更完整的专题报告。`,
    "",
    ...(candidate.items.length ? [`## 代表材料（${candidate.items.length}）`, ...candidate.items.map((item) => `- [${formatLocalTime(item.capture_time)}] ${summarizeItem(item)} (${item.id})`), ""] : []),
    ...(candidate.researchPacket ? renderResearchPacketSection(candidate.researchPacket) : []),
    `> 日期键：${date}`,
    ""
  ].join("\n");
}

function estimateReadingMinutes(items: Item[], researchPacket?: ResearchPacket): number {
  const totalLength = items.reduce((sum, item) => sum + (item.raw_content || "").length + (item.summary || "").length, 0)
    + (researchPacket?.conclusion?.length || 0)
    + researchPacketFindingsLength(researchPacket);
  const estimated = Math.ceil(totalLength / 450);
  return Math.max(30, Math.min(60, estimated));
}

function deriveKeyPoints(items: Item[], label: string, researchPacket?: ResearchPacket): string[] {
  const topItems = [...items].sort((left, right) => (right.value_score || 0) - (left.value_score || 0)).slice(0, 3);
  const points = topItems.map((item) => `${summarizeItem(item)}，时间点是 ${formatLocalDateTime(item.capture_time)}。`);
  if (!points.length && researchPacket?.findings.length) {
    points.push(...researchPacket.findings.slice(0, 3));
  }
  points.push(`这批材料共同指向 ${label}，说明它已经从输入噪声变成了有连续性的主题。`);
  return points.slice(0, 4);
}

function deriveNextSteps(items: Item[], label: string): string[] {
  const hasFollowUp = items.some((item) => item.decision === "follow_up");
  return [
    `先判断 ${label} 现在最需要的是决策、设计，还是资料补全。`,
    hasFollowUp ? `优先看其中的 follow-up 条目，避免今天只是读懂，但没有推进。` : `优先找出最值得延伸的一条材料，作为今天的深入入口。`,
    `如果读完后仍觉得材料不够，我下一轮会按 local-first + 外部补充的方式继续扩写。`
  ];
}

function summarizeItem(item: Item): string {
  const text = item.summary || item.title || item.normalized_content || item.raw_content || item.id;
  return compact(text, 72);
}

function renderReason(item: Item): string {
  if (!item.reason) {
    return "";
  }

  return `｜${compact(item.reason, 28)}`;
}

function compact(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function matchesTopic(item: Item, label: string): boolean {
  const haystack = `${item.topic || ""} ${item.title || ""} ${item.summary || ""} ${item.normalized_content || ""} ${item.raw_content || ""}`.toLowerCase();
  return label.toLowerCase().split(/\s+/).every((part) => !part || haystack.includes(part));
}

function normalizeSystemLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "综合整理";
  }

  const normalized = trimmed.replace(/[_-]+/g, " ");
  if (normalized === "ai") {
    return "AI";
  }
  if (normalized === "engineering") {
    return "工程";
  }
  if (normalized === "video") {
    return "视频";
  }
  if (normalized === "general") {
    return "综合整理";
  }

  return normalized;
}

function scoreCandidate(candidate: TopicCandidate): number {
  const itemScore = candidate.items.reduce((sum, item) => sum + (item.value_score || 0), 0);
  const decisionScore = candidate.items.reduce((sum, item) => {
    if (item.decision === "follow_up") {
      return sum + 4;
    }

    if (item.decision === "digest") {
      return sum + 2;
    }

    return sum + 1;
  }, 0);

  return itemScore + decisionScore + candidate.items.length * (candidate.sourceType === "subscription" ? 3 : 1);
}

function renderCurrentJudgment(
  label: string,
  itemCount: number,
  followUpCount: number,
  digestCount: number,
  hasResearchPacket: boolean
): string[] {
  const lines = [`- ${label} 现在已经值得被当成一个独立主题来读，而不只是零散问题。`];

  if (itemCount > 0) {
    lines.push(`- 在 ${itemCount} 条本地材料中，follow-up 有 ${followUpCount} 条，digest 有 ${digestCount} 条，说明它同时具备推进价值和复盘价值。`);
  } else if (hasResearchPacket) {
    lines.push("- 当前本地材料还不够，但受限外部资料已经足够给你建立第一轮全局判断。");
  }

  lines.push("- 如果你今天早上只读一篇，这个主题已经具备足够的密度，能帮你快速进入状态。");
  return lines;
}

function renderResearchPacketSection(packet: ResearchPacket): string[] {
  return [
    "## 外部补充",
    ...(packet.conclusion ? ["### 外部结论", packet.conclusion, ""] : []),
    ...(packet.findings.length ? ["### 外部资料提炼", ...packet.findings.map((finding) => `- ${finding}`), ""] : []),
    ...(packet.sourceUrls.length ? ["### 参考来源", ...packet.sourceUrls.map((url) => `- ${renderMarkdownLink(url)}`), ""] : [])
  ];
}

function renderMarkdownLink(url: string): string {
  const label = sourceLabelFromUrl(url);
  return `[${label}](${url})`;
}

function parseResearchPacketBody(body: string): Pick<ResearchPacket, "conclusion" | "findings"> {
  const conclusion = captureSection(body, "外部研究结论");
  const findingsSection = captureSection(body, "6 个关键发现");
  const findings = findingsSection
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);

  return {
    conclusion: conclusion || undefined,
    findings
  };
}

function captureSection(body: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = body.match(new RegExp(`##\\s+${escaped}\\n\\n([\\s\\S]*?)(?=\\n##\\s+|$)`));
  return match?.[1]?.trim() || "";
}

function researchPacketFindingsLength(packet: ResearchPacket | undefined): number {
  if (!packet) {
    return 0;
  }

  return packet.findings.reduce((sum, finding) => sum + finding.length, 0);
}

function sourceLabelFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const segment = parsed.pathname.split("/").filter(Boolean).slice(-1)[0];
    return segment ? `${host} / ${segment}` : host;
  } catch {
    return url;
  }
}
