export function normalizeContent(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function toPlainText(value: string): string {
  return normalizeContent(
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, "$1")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
  );
}

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

export function slugify(value: string, fallback = "item"): string {
  const result = value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return result || fallback;
}

export function fileSlug(value: string, fallback = "item"): string {
  const ascii = value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]+/g, " ");

  return slugify(ascii, fallback);
}

export function extractFirstUrl(value: string): string | undefined {
  const match = value.match(/https?:\/\/[^\s<>()]+[^\s<>().,!?;:]/i);
  return match?.[0];
}

export function inferTitle(value: string, url?: string): string | undefined {
  const lines = value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const heading = lines.find((line) => /^#{1,6}\s+/.test(line));
  if (heading) {
    return compactText(toPlainText(heading), 64);
  }

  const firstLine = lines[0];
  if (firstLine) {
    const plainFirstLine = toPlainText(firstLine);
    if (plainFirstLine.length <= 64) {
      return plainFirstLine;
    }

    const firstSentence = extractLeadSentence(plainFirstLine);
    if (firstSentence) {
      return compactText(firstSentence, 64);
    }
  }

  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    if (lastSegment) {
      return compactText(decodeURIComponent(lastSegment).replace(/[-_]+/g, " "), 64);
    }

    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function inferSummary(value: string, maxLength = 120, title?: string): string {
  const plain = toPlainText(value);
  if (!plain) {
    return title ? compactText(title, maxLength) : "";
  }

  const normalizedTitle = title ? toPlainText(title) : undefined;
  let candidate = plain;
  if (normalizedTitle) {
    const escapedTitle = escapeRegExp(normalizedTitle);
    candidate = candidate.replace(new RegExp(`^${escapedTitle}[：:：\\-\\s]*`, "i"), "").trim() || plain;
  }

  const leadSentence = extractLeadSentence(candidate);
  return compactText(leadSentence || candidate, maxLength);
}

export function hasActionSignal(value: string): boolean {
  return /todo|follow[ -]?up|next step|should|need to|must|verify|confirm|check|fix|ship|implement|research|investigate|排查|验证|确认|核对|修复|实现|推进|跟进|待办|计划|下一步|需要|应该|研究|梳理|整理|补充|试试/i.test(value);
}

export function isNoiseText(value: string): boolean {
  const normalized = normalizeContent(value);
  if (!normalized) {
    return true;
  }

  if (/^[\p{Emoji}\p{P}\p{S}]+$/u.test(normalized)) {
    return true;
  }

  const lowValueSet = new Set(["嗯", "哦", "啊", "哈哈", "ok", "好的", "收到"]);
  return normalized.length <= 4 && lowValueSet.has(normalized.toLowerCase());
}

function compactText(value: string, maxLength: number): string {
  const normalized = normalizeContent(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function extractLeadSentence(value: string): string | undefined {
  const normalized = normalizeContent(value);
  if (!normalized) {
    return undefined;
  }

  const match = normalized.match(/^(.{1,160}?(?:[。！？!?；;]|\.(?=\s|$)))/);
  return match?.[1]?.trim() || normalized.slice(0, 160).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
