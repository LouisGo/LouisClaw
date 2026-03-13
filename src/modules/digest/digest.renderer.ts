import { DigestEntry } from "../../domain/item.js";

export function renderDailyDigest(date: string, entries: DigestEntry[]): string {
  const followUps = sortEntries(entries.filter((entry) => entry.decision === "follow_up"));
  const digestItems = sortEntries(entries.filter((entry) => entry.decision === "digest"));
  const archiveItems = sortEntries(entries.filter((entry) => entry.decision === "archive"));
  const sortedEntries = sortEntries(entries);
  const topicLine = renderTopicLine(entries);
  const headline = renderHeadline(digestItems.length, followUps.length, archiveItems.length);
  const leadLines = renderLeadLines(sortedEntries, digestItems, followUps, archiveItems);

  return [
    `# Daily Digest - ${date}`,
    "",
    `> ${headline}`,
    `> 主题分布：${topicLine}`,
    "",
    "## 先看这个",
    ...leadLines,
    "",
    `## 今日重点（${digestItems.length}）`,
    ...(digestItems.length ? digestItems.slice(0, 5).map(renderEntryLine) : ["- 暂无"]),
    "",
    `## 需要行动（${followUps.length}）`,
    ...(followUps.length ? followUps.map(renderFollowUpLine) : ["- 暂无明确 follow-up"]),
    "",
    `## 归档参考（${archiveItems.length}）`,
    ...(archiveItems.length ? archiveItems.slice(0, 5).map(renderEntryLine) : ["- 暂无"]),
    ""
  ].join("\n");
}

export function renderItemExport(entry: DigestEntry, rawContent: string): string {
  return [
    `# ${entry.summary}`,
    "",
    `- Item ID: ${entry.id}`,
    `- Topic: ${entry.topic}`,
    `- Decision: ${entry.decision}`,
    `- Reason: ${entry.reason}`,
    ...(entry.url ? [`- URL: ${entry.url}`] : []),
    "",
    "## 原文",
    "",
    rawContent,
    ""
  ].join("\n");
}

function renderHeadline(digestCount: number, followUpCount: number, archiveCount: number): string {
  const total = digestCount + followUpCount + archiveCount;
  if (total === 0) {
    return "今日暂无新增沉淀，可把注意力留给已有事项。";
  }

  if (followUpCount > 0) {
    return `今日沉淀 ${total} 条，其中 ${followUpCount} 条已进入行动区，建议先处理 follow-up。`;
  }

  if (digestCount > 0) {
    return `今日沉淀 ${total} 条，当前以值得回看的信息为主。`;
  }

  return `今日沉淀 ${total} 条，当前以归档参考为主。`;
}

function renderTopicLine(entries: DigestEntry[]): string {
  if (!entries.length) {
    return "暂无";
  }

  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.topic, (counts.get(entry.topic) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([topic, count]) => `${renderTopicLabel(topic)}×${count}`)
    .join("，");
}

function renderEntryLine(entry: DigestEntry): string {
  const summary = compact(entry.summary, 72);
  const reason = compact(localizeReason(entry.reason), 36);
  const source = entry.url ? `｜${entry.url}` : "";
  return `- [${renderTopicLabel(entry.topic)}] ${summary}｜${reason}${source}`;
}

function renderFollowUpLine(entry: DigestEntry): string {
  const action = inferFollowUpAction(entry);
  const summary = compact(entry.summary, 68);
  const reason = compact(localizeReason(entry.reason), 28);
  const source = entry.url ? `｜${entry.url}` : "";
  return `- ${action}：${summary}｜${reason}${source}`;
}

function renderLeadLines(
  entries: DigestEntry[],
  digestItems: DigestEntry[],
  followUps: DigestEntry[],
  archiveItems: DigestEntry[]
): string[] {
  const topTopic = getTopTopic(entries);
  const topSignal = entries[0];
  const topDigest = digestItems[0];
  const topFollowUp = followUps[0];
  const topArchive = archiveItems[0];

  return [
    `- 主焦点：${describeTopTopic(topTopic)}`,
    topSignal
      ? `- 今日判断：${describeDaySignal(topSignal, followUps.length, digestItems.length)}`
      : "- 今日判断：暂无新增信号",
    topDigest
      ? `- 最值得回看：${compact(topDigest.summary, 64)}`
      : "- 最值得回看：暂无",
    topFollowUp
      ? `- 最需要行动：${compact(topFollowUp.summary, 64)}`
      : "- 最需要行动：暂无明确 follow-up",
    topArchive
      ? `- 顺手可存：${compact(topArchive.summary, 64)}`
      : "- 顺手可存：暂无额外归档参考"
  ];
}

function getTopTopic(entries: DigestEntry[]): string | undefined {
  if (!entries.length) {
    return undefined;
  }

  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.topic, (counts.get(entry.topic) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
}

function describeTopTopic(topic: string | undefined): string {
  if (!topic) {
    return "暂无明显主题";
  }

  return `${renderTopicLabel(topic)}信号最集中`;
}

function describeDaySignal(topEntry: DigestEntry, followUpCount: number, digestCount: number): string {
  if (followUpCount > 0) {
    return "今天已经出现需要推进的事项，优先看“需要行动”。";
  }

  if (digestCount > 0) {
    return `今天以信息沉淀为主，首条重点来自${renderTopicLabel(topEntry.topic)}。`;
  }

  return "今天以轻量归档为主，暂无高优先动作。";
}

function renderTopicLabel(topic: string): string {
  const labels: Record<string, string> = {
    ai: "AI",
    engineering: "工程",
    general: "综合",
    video: "视频"
  };

  return labels[topic] || topic;
}

function localizeReason(reason: string): string {
  const normalized = reason.trim();
  const mappings: Array<[RegExp, string]> = [
    [/Contains action or follow-up signals/i, "带有行动或继续跟进信号"],
    [/Likely worth reviewing later/i, "值得稍后回看"],
    [/Useful enough to keep but not urgent/i, "适合留档，暂不着急"],
    [/No reason/i, "暂无补充判断"]
  ];

  for (const [pattern, replacement] of mappings) {
    if (pattern.test(normalized)) {
      return replacement;
    }
  }

  return normalized;
}

function inferFollowUpAction(entry: DigestEntry): string {
  const text = `${entry.summary} ${entry.reason}`.toLowerCase();
  if (/confirm|确认|check|核对|verify/.test(text)) {
    return "待确认";
  }

  if (/try|试试|research|研究|investigate|排查/.test(text)) {
    return "先研究";
  }

  if (/todo|action|推进|处理|follow up|跟进/.test(text)) {
    return "先处理";
  }

  return "待跟进";
}

function sortEntries(entries: DigestEntry[]): DigestEntry[] {
  return [...entries].sort((left, right) => {
    const scoreDelta = (right.value_score || 0) - (left.value_score || 0);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    const timeDelta = (right.capture_time || "").localeCompare(left.capture_time || "");
    if (timeDelta !== 0) {
      return timeDelta;
    }

    return left.id.localeCompare(right.id);
  });
}

function compact(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
