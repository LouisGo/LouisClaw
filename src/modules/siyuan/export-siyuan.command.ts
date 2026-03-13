import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { SiYuanExportService } from "./siyuan-export.service.js";

export async function runExportSiYuanCommand(): Promise<void> {
  const config = loadConfig();
  const service = new SiYuanExportService(config, new ItemRepository(config), new StateRepository(config));
  const written = await service.export();
  console.log(`SiYuan exports: ${written.length}`);
}
