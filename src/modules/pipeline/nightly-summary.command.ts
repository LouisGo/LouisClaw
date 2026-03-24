import { logRun } from "../../shared/log.js";
import { runProcessCommand } from "../process/process.command.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";
import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { EditorialService } from "../editorial/editorial.service.js";

export async function runNightlySummaryCommand(): Promise<void> {
  await runProcessCommand();

  const config = loadConfig();
  const service = new EditorialService(config, new ItemRepository(config));
  const result = service.buildEveningReview();
  let siyuanSynced = false;

  logRun(config, `nightly summary review=${result.filePath}`);

  if (config.flags.enableSiYuanExport) {
    try {
      await runExportSiYuanCommand();
      siyuanSynced = true;
    } catch {
      siyuanSynced = false;
    }
  }

  console.log("Nightly summary complete");
  console.log(`Evening review: ${result.title}`);
  console.log(`Path: ${result.filePath}`);
  console.log(`SiYuan synced: ${siyuanSynced ? "yes" : "no"}`);
}
