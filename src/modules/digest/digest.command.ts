import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { DigestService } from "./digest.service.js";
import { ExportService } from "../export/export.service.js";

export function runDigestCommand(): void {
  const config = loadConfig();
  const itemRepository = new ItemRepository(config);
  const digestService = new DigestService(config, itemRepository);
  const exportService = new ExportService(config, itemRepository);

  const digestPath = digestService.generateDaily();
  const attachmentPath = exportService.exportDigestAttachment(digestPath);
  const itemExports = exportService.exportProcessedItems();

  logRun(config, `digest generated ${digestPath}`);
  logRun(config, `digest attachment exported ${attachmentPath}`);
  logRun(config, `item exports count=${itemExports.length}`);

  console.log(`Digest: ${digestPath}`);
  console.log(`Digest attachment: ${attachmentPath}`);
  console.log(`Item exports: ${itemExports.length}`);
}
