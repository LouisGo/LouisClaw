import fs from "node:fs";
import path from "node:path";
import { AppConfig, MarkdownPullSourceConfig } from "../../app/config.js";
import { IntakeInput } from "../../domain/item.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { fileExists, readTextFile } from "../../shared/fs.js";
import { sha1 } from "../../shared/hash.js";
import { nowIso } from "../../shared/time.js";
import { IntakeService } from "./intake.service.js";
import { intakeInputSchema } from "./intake.schema.js";

export interface MarkdownPullResult {
  seeded: string[];
  imported: string[];
  skipped: string[];
}

export class MarkdownSourcePullService {
  constructor(
    private readonly config: AppConfig,
    private readonly stateRepository: StateRepository,
    private readonly intakeService: IntakeService
  ) {}

  run(): MarkdownPullResult {
    const state = this.stateRepository.loadMarkdownSourceState();
    const result: MarkdownPullResult = {
      seeded: [],
      imported: [],
      skipped: []
    };

    for (const source of this.config.markdownPull.sources) {
      if (!fileExists(source.path)) {
        result.skipped.push(`${source.path}#missing`);
        continue;
      }

      const current = this.readCurrent(source.path);
      const previous = state[source.path];

      if (!previous) {
        state[source.path] = current;
        result.seeded.push(source.path);
        continue;
      }

      if (previous.size === current.size && previous.mtimeMs === current.mtimeMs) {
        result.skipped.push(`${source.path}#unchanged`);
        continue;
      }

      const currentBuffer = fs.readFileSync(source.path);

      if (current.size > previous.size) {
        const prefix = currentBuffer.subarray(0, previous.size).toString("utf8");
        if (sha1(prefix) === previous.contentHash) {
          const appended = currentBuffer.subarray(previous.size).toString("utf8").trim();
          state[source.path] = current;

          if (!appended) {
            result.skipped.push(`${source.path}#empty-append`);
            continue;
          }

          const input = this.buildInput(source, appended);
          const landingPath = this.intakeService.enqueue(input, this.config.paths.landing);
          state[source.path].lastImportedAt = input.capture_time;
          result.imported.push(landingPath);
          continue;
        }
      }

      state[source.path] = current;
      result.skipped.push(`${source.path}#rewrite`);
    }

    this.stateRepository.saveMarkdownSourceState(state);
    return result;
  }

  private buildInput(source: MarkdownPullSourceConfig, rawContent: string): IntakeInput {
    const captureTime = nowIso();

    return intakeInputSchema.parse({
      source: source.source,
      device: source.device,
      capture_time: captureTime,
      content_type: "text",
      raw_content: rawContent,
      title: source.title || path.basename(source.path)
    });
  }

  private readCurrent(filePath: string) {
    const stats = fs.statSync(filePath);
    const content = readTextFile(filePath);
    return {
      size: stats.size,
      mtimeMs: stats.mtimeMs,
      contentHash: sha1(content)
    };
  }
}
