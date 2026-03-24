import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { listFiles, readTextFile, writeTextFile } from "../../shared/fs.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
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
    const editorialWritten = listEditorialFiles(this.config).map((entry) => {
      const parsed = matter(readTextFile(entry.filePath));
      const exportId = getSynthesisId(parsed.data.id, path.basename(entry.filePath, ".md"));
      const existingPath = itemMap[exportId]?.path;
      const targetPath = existingPath || path.join(this.config.paths.siyuanExportRoot as string, entry.folderName, path.basename(entry.filePath));
      writeTextFile(targetPath, readTextFile(entry.filePath));
      itemMap[exportId] = {
        mode: "filesystem",
        path: targetPath
      };
      return targetPath;
    });

    this.stateRepository.saveSiYuanMap(itemMap);
    return editorialWritten;
  }
}

function getSynthesisId(rawId: unknown, fileName: string): string {
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim();
  }

  return `synthesis:${fileName}`;
}

function listEditorialFiles(config: AppConfig): Array<{ filePath: string; folderName: string }> {
  return [
    ...listFiles(config.paths.editorialMorning, ".md").map((filePath) => ({ filePath, folderName: "晨间输出" })),
    ...listFiles(config.paths.editorialEvening, ".md").map((filePath) => ({ filePath, folderName: "夜间回看" })),
    ...listFiles(config.paths.editorialKnowledge, ".md").map((filePath) => ({ filePath, folderName: "知识沉淀" }))
  ];
}
