import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { writeTextFile } from "../../shared/fs.js";
import { nowIso, dateStamp } from "../../shared/time.js";
import { slugify } from "../../shared/text.js";

export class SiYuanExportService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository,
    private readonly stateRepository: StateRepository
  ) {}

  export(): string[] {
    if (!this.config.flags.enableSiYuanExport || !this.config.paths.siyuanExportRoot) {
      return [];
    }

    const itemMap = this.stateRepository.loadSiYuanMap();
    const today = dateStamp();
    const items = this.itemRepository.loadAll().filter((item) => item.decision && item.decision !== "drop");

    const written = items.map((item) => {
      const section = item.decision === "follow_up" ? "follow-ups" : item.decision === "digest" ? "archive" : "archive";
      const existingPath = itemMap[item.id];
      const fileName = `${today}-${item.id}-${slugify(item.title || item.summary || item.topic || "item")}.md`;
      const targetPath = existingPath || path.join(this.config.paths.siyuanExportRoot as string, section, fileName);
      const body = [
        `# ${item.summary || item.title || item.id}`,
        "",
        `- Reason: ${item.reason || "No reason"}`,
        ...(item.url ? [`- URL: ${item.url}`] : []),
        "",
        "## Source",
        "",
        item.raw_content,
        ""
      ].join("\n");

      writeTextFile(targetPath, matter.stringify(body, {
        id: item.id,
        created_by: "ai-flow",
        source_item_id: item.id,
        decision: item.decision,
        topic: item.topic || "general",
        capture_time: item.capture_time
      }));

      itemMap[item.id] = targetPath;
      this.itemRepository.save({
        ...item,
        siYuan_sync: {
          exported: true,
          path: targetPath,
          updated_at: nowIso()
        },
        status: "exported"
      });

      return targetPath;
    });

    this.stateRepository.saveSiYuanMap(itemMap);
    return written;
  }
}
