import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { runProcessCommand } from "../process/process.command.js";
import { DigestService } from "../digest/digest.service.js";
import { ExportService } from "../export/export.service.js";

export async function runPipelineCommand(): Promise<void> {
  await runProcessCommand();

  const config = loadConfig();
  const itemRepository = new ItemRepository(config);
  const digestService = new DigestService(config, itemRepository);
  const exportService = new ExportService(config, itemRepository);

  const digestPath = digestService.generateDaily();
  const digestAttachmentPath = exportService.exportDigestAttachment(digestPath);
  const itemExports = exportService.exportProcessedItems();

  logRun(config, `pipeline run complete digest=${digestPath}`);
  logRun(config, `pipeline digest attachment exported ${digestAttachmentPath}`);
  logRun(config, `pipeline item exports count=${itemExports.length}`);

  console.log(`Pipeline complete`);
  console.log(`Digest: ${digestPath}`);
  console.log(`Digest attachment: ${digestAttachmentPath}`);
  console.log(`Item exports: ${itemExports.length}`);
}
