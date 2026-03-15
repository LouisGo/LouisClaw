const DISPLAY_TIME_ZONE = "Asia/Shanghai";

export function nowIso(): string {
  return new Date().toISOString();
}

export function dateStamp(date: Date = new Date()): string {
  return formatLocalDate(date);
}

export function compactTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export function formatLocalDateTime(value: string | Date): string {
  const parts = formatParts(value);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatLocalDate(value: string | Date): string {
  const parts = formatParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatLocalTime(value: string | Date): string {
  const parts = formatParts(value);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

export function isSameLocalDate(value: string | Date, localDate: string): boolean {
  return formatLocalDate(value) === localDate;
}

export function timezoneLabel(): string {
  return DISPLAY_TIME_ZONE;
}

function formatParts(value: string | Date): Record<string, string> {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  return formatter.formatToParts(date).reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});
}
