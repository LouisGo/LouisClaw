export function normalizeContent(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

export function slugify(value: string, fallback = "item"): string {
  const result = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return result || fallback;
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
