import { DigestEntry } from "../../domain/item.js";

export function renderDailyDigest(date: string, entries: DigestEntry[]): string {
  const followUps = entries.filter((entry) => entry.decision === "follow_up");
  const digestItems = entries.filter((entry) => entry.decision === "digest");
  const archiveItems = entries.filter((entry) => entry.decision === "archive");

  return [
    `# Daily Digest - ${date}`,
    "",
    "## 今日重点",
    ...(digestItems.length ? digestItems.slice(0, 5).map((entry) => `- ${entry.summary}｜${entry.reason}${entry.url ? `｜${entry.url}` : ""}`) : ["- 暂无"]),
    "",
    "## 需要行动",
    ...(followUps.length ? followUps.map((entry) => `- ${entry.summary}｜${entry.reason}${entry.url ? `｜${entry.url}` : ""}`) : ["- 暂无"]),
    "",
    "## 归档参考",
    ...(archiveItems.length ? archiveItems.map((entry) => `- ${entry.summary}｜${entry.reason}${entry.url ? `｜${entry.url}` : ""}`) : ["- 暂无"]),
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
