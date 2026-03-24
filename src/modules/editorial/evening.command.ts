import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { EditorialService } from "./editorial.service.js";

export interface EveningCommandOptions {
  theme?: string;
}

export function runEveningCommand(options: EveningCommandOptions = {}): void {
  const config = loadConfig();
  const service = new EditorialService(config, new ItemRepository(config));
  const result = service.buildEveningReview({ theme: options.theme });
  logRun(config, `evening review generated ${result.filePath}`);
  console.log(`Evening review: ${result.title}`);
  console.log(`Theme: ${result.themeLabel}`);
  console.log(`Path: ${result.filePath}`);
}
