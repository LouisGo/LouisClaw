import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { EditorialService } from "./editorial.service.js";

export interface KnowledgeCommandOptions {
  theme?: string;
}

export function runKnowledgeCommand(options: KnowledgeCommandOptions = {}): void {
  const config = loadConfig();
  const service = new EditorialService(config, new ItemRepository(config));
  const result = service.buildKnowledgeNote({ theme: options.theme });
  logRun(config, `knowledge note generated ${result.filePath}`);
  console.log(`Knowledge note: ${result.title}`);
  console.log(`Theme: ${result.themeLabel}`);
  console.log(`Path: ${result.filePath}`);
}
