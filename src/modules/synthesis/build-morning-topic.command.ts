import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";
import { EditorialService } from "../editorial/editorial.service.js";

export async function runBuildMorningTopicCommand(): Promise<void> {
  const config = loadConfig();
  const result = new EditorialService(config, new ItemRepository(config)).buildMorningBrief();
  logRun(config, `morning brief generated ${result.filePath}`);
  console.log(`Morning brief: ${result.title}`);
  console.log(`Theme: ${result.themeLabel}`);
  console.log(`Path: ${result.filePath}`);

  if (config.flags.enableSiYuanExport) {
    try {
      await runExportSiYuanCommand();
    } catch {
      return;
    }
  }
}
