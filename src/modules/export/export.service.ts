import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { readTextFile, writeTextFile } from "../../shared/fs.js";
import { dateStamp, isSameLocalDate } from "../../shared/time.js";
import { fileSlug } from "../../shared/text.js";
import { renderItemExport } from "../digest/digest.renderer.js";

export class ExportService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository
  ) {}

  exportDigestAttachment(digestPath: string): string {
    const fileName = path.basename(digestPath);
    const targetPath = path.join(this.config.paths.exportDigests, fileName);
    writeTextFile(targetPath, readTextFile(digestPath));
    return targetPath;
  }

  exportProcessedItems(): string[] {
    const today = dateStamp();
    const items = this.itemRepository.loadAll()
      .filter((item) => isSameLocalDate(item.capture_time, today))
      .filter((item) => item.decision === "digest" || item.decision === "follow_up");

    return items.map((item) => {
      const folder = item.decision === "follow_up" ? this.config.paths.exportFollowUps : this.config.paths.exportItems;
      const filePath = path.join(folder, `${today}-${item.id}-${fileSlug(item.title || item.summary || item.topic || "item", item.topic || "item")}.md`);

      writeTextFile(filePath, renderItemExport({
        id: item.id,
        summary: item.summary || item.normalized_content.slice(0, 80),
        reason: item.reason || "No reason",
        topic: item.topic || "general",
        decision: item.decision || "archive",
        capture_time: item.capture_time,
        url: item.url
      }, item.raw_content));

      return filePath;
    });
  }
}
