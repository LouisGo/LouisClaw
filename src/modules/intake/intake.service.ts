import path from "node:path";
import { IntakeInput, Item } from "../../domain/item.js";
import { AppConfig } from "../../app/config.js";
import { writeJsonFile } from "../../shared/fs.js";
import { sha1 } from "../../shared/hash.js";
import { compactTimestamp, nowIso } from "../../shared/time.js";
import { inferTitle, normalizeContent } from "../../shared/text.js";

export class IntakeService {
  constructor(private readonly config: AppConfig) {}

  enqueue(input: IntakeInput, targetDir = this.config.paths.inbox): string {
    const stamp = `${compactTimestamp()}_${sha1(JSON.stringify(input)).slice(0, 6)}`;
    const filePath = path.join(targetDir, `${stamp}.json`);
    writeJsonFile(filePath, input);
    return filePath;
  }

  buildItem(input: IntakeInput): Item {
    const normalizedContent = normalizeContent(input.raw_content);
    const id = `item_${compactTimestamp()}_${sha1(`${input.source}:${input.capture_time}:${normalizedContent}`).slice(0, 6)}`;
    const dedupeKey = input.url ? `url:${input.url}` : `text:${sha1(normalizedContent)}`;

    return {
      id,
      source: input.source,
      device: input.device,
      capture_time: input.capture_time || nowIso(),
      content_type: input.content_type,
      raw_content: input.raw_content,
      normalized_content: normalizedContent,
      url: input.url,
      title: input.title || inferTitle(input.raw_content, input.url),
      tags: [],
      status: "pending",
      value_score: 0,
      dedupe_key: dedupeKey,
      siYuan_sync: { exported: false }
    };
  }

  saveRawSnapshot(item: Item): void {
    writeJsonFile(path.join(this.config.paths.raw, `${item.id}.json`), {
      id: item.id,
      stored_at: nowIso(),
      payload: item
    });
  }
}
