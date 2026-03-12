import path from "node:path";
import matter from "gray-matter";
import { IntakeInput } from "../../domain/item.js";
import { readJsonFile, readTextFile } from "../../shared/fs.js";
import { nowIso } from "../../shared/time.js";
import { intakeInputSchema } from "./intake.schema.js";

function normalizeCaptureTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === "string" && value.length > 0 ? value : nowIso();
}

function defaultContentType(ext: string): IntakeInput["content_type"] {
  return ext === ".md" ? "text" : "text";
}

export class InboxFileService {
  parse(filePath: string): IntakeInput {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === ".json") {
      return intakeInputSchema.parse(readJsonFile(filePath));
    }

    if (ext === ".md") {
      const parsed = matter(readTextFile(filePath));
      return intakeInputSchema.parse({
        source: parsed.data.source || "manual",
        device: parsed.data.device || "local",
        capture_time: normalizeCaptureTime(parsed.data.capture_time),
        content_type: parsed.data.content_type || defaultContentType(ext),
        raw_content: parsed.content.trim(),
        url: parsed.data.url,
        title: parsed.data.title
      });
    }

    if (ext === ".txt") {
      return intakeInputSchema.parse({
        source: "manual",
        device: "local",
        capture_time: nowIso(),
        content_type: "text",
        raw_content: readTextFile(filePath).trim(),
        title: path.basename(filePath)
      });
    }

    throw new Error(`Unsupported inbox file format: ${ext}`);
  }
}
