import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { DigestEntry, Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { writeTextFile } from "../../shared/fs.js";
import { dateStamp } from "../../shared/time.js";
import { renderDailyDigest } from "./digest.renderer.js";

function toDigestEntry(item: Item): DigestEntry {
  return {
    id: item.id,
    summary: item.summary || item.title || item.normalized_content.slice(0, 80),
    reason: item.reason || "No reason",
    topic: item.topic || "general",
    decision: item.decision || "archive",
    url: item.url
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
      .filter((item) => item.capture_time.startsWith(today))
      .filter((item) => item.decision && item.decision !== "drop")
      .map(toDigestEntry);

    const filePath = path.join(this.config.paths.digests, `${today}-daily-digest.md`);
    writeTextFile(filePath, renderDailyDigest(today, entries));
    return filePath;
  }
}
