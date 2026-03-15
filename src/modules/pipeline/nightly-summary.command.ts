import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { runProcessCommand } from "../process/process.command.js";
import { DigestService } from "../digest/digest.service.js";
import { ExportService } from "../export/export.service.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";

export async function runNightlySummaryCommand(): Promise<void> {
  await runProcessCommand();

  const config = loadConfig();
  const itemRepository = new ItemRepository(config);
  const digestService = new DigestService(config, itemRepository);
  const exportService = new ExportService(config, itemRepository);

  const digestPath = digestService.generateDaily();
  const digestAttachmentPath = exportService.exportDigestAttachment(digestPath);
  const itemExports = exportService.exportProcessedItems();

  logRun(config, `nightly summary digest=${digestPath}`);
  logRun(config, `nightly summary attachment=${digestAttachmentPath}`);
  logRun(config, `nightly summary item exports count=${itemExports.length}`);

  if (config.flags.enableSiYuanExport) {
    await runExportSiYuanCommand();
  }

  console.log("Nightly summary complete");
  console.log(`Digest: ${digestPath}`);
  console.log(`Digest attachment: ${digestAttachmentPath}`);
  console.log(`Item exports: ${itemExports.length}`);
}
