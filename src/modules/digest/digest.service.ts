import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { DigestEntry, Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { writeTextFile } from "../../shared/fs.js";
import { dateStamp, isSameLocalDate } from "../../shared/time.js";
import { extractFirstUrl } from "../../shared/text.js";
import { renderDailyDigest } from "./digest.renderer.js";

function toDigestEntry(item: Item): DigestEntry {
  return {
    id: item.id,
    summary: item.summary || item.title || item.normalized_content.slice(0, 80),
    reason: item.reason || "No reason",
    topic: item.topic || "general",
    decision: item.decision || "archive",
    capture_time: item.capture_time,
    value_score: item.value_score,
    url: item.url || extractFirstUrl(item.raw_content)
  };
}

export class DigestService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository
  ) {}

  generateDaily(): string {
    const today = dateStamp();
    const entries = this.itemRepository.loadAll()
      .filter((item) => isSameLocalDate(item.capture_time, today))
      .filter((item) => item.decision && item.decision !== "drop")
      .map(toDigestEntry);

    const filePath = path.join(this.config.paths.digests, `${today}-daily-digest.md`);
    writeTextFile(filePath, renderDailyDigest(today, entries));
    return filePath;
  }
}
