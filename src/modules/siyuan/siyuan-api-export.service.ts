import path from "node:path";
import { AppConfig } from "../../app/config.js";
import { Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { SiYuanMapEntry, StateRepository } from "../../infra/storage/state-repository.js";
import { readTextFile } from "../../shared/fs.js";
import { dateStamp, nowIso } from "../../shared/time.js";
import { slugify } from "../../shared/text.js";
import { renderItemExport } from "../digest/digest.renderer.js";
import { SiYuanApiClient } from "./siyuan-api.client.js";

export class SiYuanApiExportService {
  constructor(
    private readonly config: AppConfig,
    private readonly itemRepository: ItemRepository,
    private readonly stateRepository: StateRepository,
    private readonly client: SiYuanApiClient
  ) {}

  async export(): Promise<string[]> {
    const notebookId = await this.ensureNotebook(this.config.siyuan.notebook);
    const itemMap = this.stateRepository.loadSiYuanMap();
    const today = dateStamp();
    const written: string[] = [];

    const digestPath = path.join(this.config.paths.digests, `${today}-daily-digest.md`);
    const digestMarkdown = readTextFile(digestPath);
    const digestHPath = `/digests/${today}-daily-digest`;
    const digestDoc = await this.ensureDoc(notebookId, digestHPath, digestMarkdown);
    itemMap[`digest:${today}`] = {
      mode: "api",
      notebookId,
      docId: digestDoc.docId,
      path: digestDoc.hPath
    };
    written.push(digestDoc.hPath);

    const items = this.itemRepository.loadAll()
      .filter((item) => item.capture_time.startsWith(today))
      .filter((item) => item.decision === "digest" || item.decision === "follow_up");

    for (const item of items) {
      const hPath = `/items/${today}-${item.id}-${slugify(item.title || item.summary || item.topic || "item")}`;
      const markdown = renderItemExport({
        id: item.id,
        summary: item.summary || item.normalized_content.slice(0, 80),
        reason: item.reason || "No reason",
        topic: item.topic || "general",
        decision: item.decision || "archive",
        url: item.url
      }, item.raw_content);

      const result = await this.ensureDoc(notebookId, hPath, markdown);
      itemMap[item.id] = {
        mode: "api",
        notebookId,
        docId: result.docId,
        path: result.hPath
      };
      this.itemRepository.save({
        ...item,
        siYuan_sync: {
          exported: true,
          mode: "api",
          notebook_id: notebookId,
          doc_id: result.docId,
          path: result.hPath,
          updated_at: nowIso()
        },
        status: "exported"
      });
      written.push(result.hPath);
    }

    this.stateRepository.saveSiYuanMap(itemMap);
    return written;
  }

  private async ensureNotebook(name: string): Promise<string> {
    const notebooks = await this.client.lsNotebooks();
    const existing = notebooks.find((notebook) => notebook.name === name);

    if (existing) {
      return existing.id;
    }

    const created = await this.client.createNotebook(name);
    return created.id;
  }

  private async ensureDoc(notebookId: string, hPath: string, markdown: string): Promise<{ docId: string; hPath: string }> {
    const existingIds = await this.client.getIDsByHPath(notebookId, hPath);
    const docId = existingIds[0] || await this.client.createDocWithMd(notebookId, hPath, markdown);

    if (this.config.siyuan.validate) {
      const resolvedPath = await this.client.getHPathByID(docId);
      if (resolvedPath !== hPath) {
        throw new Error(`SiYuan doc validation failed for ${hPath}, got ${resolvedPath}`);
      }
    }

    return { docId, hPath };
  }
}
