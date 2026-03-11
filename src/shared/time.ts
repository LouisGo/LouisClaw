export function nowIso(): string {
  return new Date().toISOString();
}

export function dateStamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function compactTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}
