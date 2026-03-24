import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { EditorialService } from "./editorial.service.js";

export interface MorningCommandOptions {
  theme?: string;
}

export function runMorningCommand(options: MorningCommandOptions = {}): void {
  const config = loadConfig();
  const service = new EditorialService(config, new ItemRepository(config));
  const result = service.buildMorningBrief({ theme: options.theme });
  logRun(config, `morning brief generated ${result.filePath}`);
  console.log(`Morning brief: ${result.title}`);
  console.log(`Theme: ${result.themeLabel}`);
  console.log(`Path: ${result.filePath}`);
}
