import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { Item } from "../../domain/item.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { SiYuanMapEntry, StateRepository } from "../../infra/storage/state-repository.js";
import { listFiles, readTextFile } from "../../shared/fs.js";
import { dateStamp, isSameLocalDate, nowIso } from "../../shared/time.js";
import { extractFirstUrl, fileSlug } from "../../shared/text.js";
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
    const digestDoc = await this.ensureDoc(notebookId, `digest:${today}`, digestHPath, digestMarkdown, itemMap);
    itemMap[`digest:${today}`] = {
      mode: "api",
      notebookId,
      docId: digestDoc.docId,
      path: digestDoc.hPath
    };
    written.push(digestDoc.hPath);

    const items = this.itemRepository.loadAll()
      .filter((item) => isSameLocalDate(item.capture_time, today))
      .filter((item) => item.decision === "digest" || item.decision === "follow_up");

    for (const item of items) {
      const section = item.decision === "follow_up" ? "follow-ups" : "items";
      const hPath = `/${section}/${today}-${item.id}-${fileSlug(item.title || item.summary || item.topic || "item", item.topic || "item")}`;
      const markdown = renderItemExport({
        id: item.id,
        summary: item.summary || item.normalized_content.slice(0, 80),
        reason: item.reason || "No reason",
        topic: item.topic || "general",
        decision: item.decision || "archive",
        capture_time: item.capture_time,
        url: item.url || extractFirstUrl(item.raw_content)
      }, item.raw_content);

      const result = await this.ensureDoc(notebookId, item.id, hPath, markdown, itemMap);
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

    const synthesisFiles = listFiles(this.config.paths.exportSynthesis, ".md");
    for (const filePath of synthesisFiles) {
      const parsed = matter(readTextFile(filePath));
      const fileName = path.basename(filePath, ".md");
      const synthesisId = getSynthesisId(parsed.data.id, fileName);
      const hPath = `/synthesis/${fileName}`;
      const markdown = parsed.content.trim() ? `${parsed.content.trim()}\n` : "";
      const result = await this.ensureDoc(notebookId, synthesisId, hPath, markdown, itemMap);
      itemMap[synthesisId] = {
        mode: "api",
        notebookId,
        docId: result.docId,
        path: result.hPath
      };
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

  private async ensureDoc(
    notebookId: string,
    mapKey: string,
    hPath: string,
    markdown: string,
    itemMap: Record<string, SiYuanMapEntry>
  ): Promise<{ docId: string; hPath: string }> {
    const docId = await this.ensureDocId(notebookId, mapKey, hPath, markdown, itemMap);

    if (this.config.siyuan.validate) {
      const resolvedPath = await this.client.getHPathByID(docId);
      if (resolvedPath !== hPath) {
        throw new Error(`SiYuan doc validation failed for ${hPath}, got ${resolvedPath}`);
      }
    }

    return { docId, hPath };
  }

  private async ensureDocId(
    notebookId: string,
    mapKey: string,
    hPath: string,
    markdown: string,
    itemMap: Record<string, SiYuanMapEntry>
  ): Promise<string> {
    const mapped = itemMap[mapKey];
    const mappedDocId = await this.resolveMappedDocId(mapped, notebookId, hPath);
    const pathDocId = await this.resolvePathDocId(notebookId, hPath);
    const activeDocId = pathDocId || mappedDocId;

    if (!activeDocId) {
      return this.client.createDocWithMd(notebookId, hPath, markdown);
    }

    const existing = await this.client.exportMdContent(activeDocId);
    if (existing.content === markdown && existing.hPath === hPath) {
      return activeDocId;
    }

    if (existing.hPath === hPath) {
      await this.client.removeDocByID(activeDocId);
      return this.client.createDocWithMd(notebookId, hPath, markdown);
    }

    return this.client.createDocWithMd(notebookId, hPath, markdown);
  }

  private async resolveMappedDocId(
    mapped: SiYuanMapEntry | undefined,
    notebookId: string,
    hPath: string
  ): Promise<string | undefined> {
    if (!mapped || mapped.mode !== "api" || !mapped.docId || mapped.notebookId !== notebookId) {
      return undefined;
    }

    try {
      const resolvedPath = await this.client.getHPathByID(mapped.docId);
      return resolvedPath === hPath ? mapped.docId : undefined;
    } catch {
      return undefined;
    }
  }

  private async resolvePathDocId(notebookId: string, hPath: string): Promise<string | undefined> {
    const existingIds = await this.client.getIDsByHPath(notebookId, hPath);
    if (existingIds[0]) {
      return existingIds[0];
    }

    return undefined;
  }
}

function getSynthesisId(rawId: unknown, fileName: string): string {
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim();
  }

  return `synthesis:${fileName}`;
}
