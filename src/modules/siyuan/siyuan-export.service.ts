import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { listFiles, readTextFile, writeTextFile } from "../../shared/fs.js";
import { nowIso, dateStamp } from "../../shared/time.js";
import { extractFirstUrl, slugify } from "../../shared/text.js";
import { SiYuanApiClient } from "./siyuan-api.client.js";
import { SiYuanApiExportService } from "./siyuan-api-export.service.js";

export class SiYuanExportService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository,
    private readonly stateRepository: StateRepository
  ) {}

  async export(): Promise<string[]> {
    if (!this.config.flags.enableSiYuanExport) {
      return [];
    }

    if (this.config.siyuan.driver === "api") {
      if (!this.config.siyuan.apiToken) {
        throw new Error("缺少 SIYUAN_API_TOKEN");
      }

      const service = new SiYuanApiExportService(
        this.config,
        this.itemRepository,
        this.stateRepository,
        new SiYuanApiClient(this.config.siyuan.apiUrl, this.config.siyuan.apiToken)
      );

      return service.export();
    }

    if (!this.config.paths.siyuanExportRoot) {
      return [];
    }

    const itemMap = this.stateRepository.loadSiYuanMap();
    const today = dateStamp();
    const items = this.itemRepository.loadAll().filter((item) => item.decision && item.decision !== "drop");

    const written = items.map((item) => {
      const section = item.decision === "follow_up" ? "follow-ups" : "items";
      const existingPath = itemMap[item.id]?.path;
      const fileName = `${today}-${item.id}-${slugify(item.title || item.summary || item.topic || "item")}.md`;
      const targetPath = existingPath || path.join(this.config.paths.siyuanExportRoot as string, section, fileName);
      const itemUrl = item.url || extractFirstUrl(item.raw_content);
      const body = [
        `# ${item.summary || item.title || item.id}`,
        "",
        `- Reason: ${item.reason || "No reason"}`,
        ...(itemUrl ? [`- URL: ${itemUrl}`] : []),
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

      itemMap[item.id] = {
        mode: "filesystem",
        path: targetPath
      };
      this.itemRepository.save({
        ...item,
        siYuan_sync: {
          exported: true,
          mode: "filesystem",
          path: targetPath,
          updated_at: nowIso()
        },
        status: "exported"
      });

      return targetPath;
    });

    const synthesisWritten = listFiles(this.config.paths.exportSynthesis, ".md").map((filePath) => {
      const parsed = matter(readTextFile(filePath));
      const fileName = path.basename(filePath);
      const synthesisId = getSynthesisId(parsed.data.id, path.basename(filePath, ".md"));
      const existingPath = itemMap[synthesisId]?.path;
      const targetPath = existingPath || path.join(this.config.paths.siyuanExportRoot as string, "synthesis", fileName);
      writeTextFile(targetPath, readTextFile(filePath));
      itemMap[synthesisId] = {
        mode: "filesystem",
        path: targetPath
      };
      return targetPath;
    });

    this.stateRepository.saveSiYuanMap(itemMap);
    return [...written, ...synthesisWritten];
  }
}

function getSynthesisId(rawId: unknown, fileName: string): string {
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim();
  }

  return `synthesis:${fileName}`;
}
