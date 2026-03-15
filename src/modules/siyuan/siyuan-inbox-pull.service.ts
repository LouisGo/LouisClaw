import path from "node:path";
import matter from "gray-matter";
import { AppConfig } from "../../app/config.js";
import { IntakeInput } from "../../domain/item.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { sha1 } from "../../shared/hash.js";
import { nowIso } from "../../shared/time.js";
import { IntakeService } from "../intake/intake.service.js";
import { intakeInputSchema } from "../intake/intake.schema.js";
import { SiYuanApiClient } from "./siyuan-api.client.js";

export interface SiYuanInboxPullResult {
  seeded: string[];
  imported: string[];
  skipped: string[];
}

export class SiYuanInboxPullService {
  constructor(
    private readonly config: AppConfig,
    private readonly stateRepository: StateRepository,
    private readonly intakeService: IntakeService,
    private readonly client: SiYuanApiClient
  ) {}

  async run(): Promise<SiYuanInboxPullResult> {
    const result: SiYuanInboxPullResult = {
      seeded: [],
      imported: [],
      skipped: []
    };

    const inbox = this.config.siyuan.inbox;
    if (!inbox.notebook || !inbox.hPath) {
      result.skipped.push("config#disabled");
      return result;
    }

    const notebooks = await this.client.lsNotebooks();
    const notebook = notebooks.find((entry) => entry.name === inbox.notebook);
    if (!notebook) {
      result.skipped.push(`${inbox.notebook}:${inbox.hPath}#notebook-missing`);
      return result;
    }

    const docIds = await this.client.getIDsByHPath(notebook.id, inbox.hPath);
    if (!docIds[0]) {
      result.skipped.push(`${inbox.notebook}:${inbox.hPath}#doc-missing`);
      return result;
    }

    const exported = await this.client.exportMdContent(docIds[0]);
    const state = this.stateRepository.loadSiYuanInboxState();
    const stateKey = `${notebook.id}:${inbox.hPath}`;
    const previous = state[stateKey];
    const currentBody = this.extractComparableContent(exported.content);
    const previousBody = previous ? this.extractComparableContent(previous.contentSnapshot) : undefined;
    const current = {
      notebookId: notebook.id,
      notebookName: notebook.name,
      hPath: inbox.hPath,
      docId: docIds[0],
      contentHash: sha1(currentBody),
      contentLength: currentBody.length,
      contentSnapshot: currentBody,
      lastSeenAt: nowIso()
    };

    if (!previous) {
      state[stateKey] = current;
      this.stateRepository.saveSiYuanInboxState(state);
      result.seeded.push(`${notebook.name}:${inbox.hPath}`);
      return result;
    }

    if (previousBody === currentBody) {
      state[stateKey] = {
        ...previous,
        ...current,
        lastImportedAt: previous.lastImportedAt
      };
      this.stateRepository.saveSiYuanInboxState(state);
      result.skipped.push(`${notebook.name}:${inbox.hPath}#unchanged`);
      return result;
    }

    if (previousBody !== undefined && currentBody.length > previousBody.length && currentBody.startsWith(previousBody)) {
      const appended = currentBody.slice(previousBody.length).trim();
      state[stateKey] = current;

      if (!appended) {
        this.stateRepository.saveSiYuanInboxState(state);
        result.skipped.push(`${notebook.name}:${inbox.hPath}#empty-append`);
        return result;
      }

      const input = this.buildInput(appended);
      const landingPath = this.intakeService.enqueue(input, this.config.paths.landing);
      state[stateKey].lastImportedAt = input.capture_time;
      this.stateRepository.saveSiYuanInboxState(state);
      result.imported.push(landingPath);
      return result;
    }

    state[stateKey] = {
      ...previous,
      ...current,
      lastImportedAt: previous.lastImportedAt
    };
    this.stateRepository.saveSiYuanInboxState(state);
    result.skipped.push(`${notebook.name}:${inbox.hPath}#rewrite`);
    return result;
  }

  private buildInput(rawContent: string): IntakeInput {
    const captureTime = nowIso();
    const inbox = this.config.siyuan.inbox;

    return intakeInputSchema.parse({
      source: inbox.source,
      device: inbox.device,
      capture_time: captureTime,
      content_type: "text",
      raw_content: rawContent,
      title: inbox.title || inferTitleFromHPath(inbox.hPath)
    });
  }

  private extractComparableContent(markdown: string): string {
    return matter(markdown).content;
  }
}

function inferTitleFromHPath(hPath: string | undefined): string {
  if (!hPath) {
    return "SiYuan Inbox";
  }

  const trimmed = hPath.endsWith("/") ? hPath.slice(0, -1) : hPath;
  const baseName = path.posix.basename(trimmed);
  return baseName || "SiYuan Inbox";
}
