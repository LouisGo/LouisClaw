import { loadConfig } from "../../app/config.js";
import { logRun } from "../../shared/log.js";
import { runProcessCommand } from "../process/process.command.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";
import { EditorialService } from "../editorial/editorial.service.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";

export async function runPipelineCommand(): Promise<void> {
  await runProcessCommand();

  const config = loadConfig();
  const service = new EditorialService(config, new ItemRepository(config));
  const morning = service.buildMorningBrief();
  const evening = service.buildEveningReview();
  const knowledge = service.buildKnowledgeNote({ theme: "知识沉淀" });

  logRun(config, `pipeline morning=${morning.filePath}`);
  logRun(config, `pipeline evening=${evening.filePath}`);
  logRun(config, `pipeline knowledge=${knowledge.filePath}`);

  if (config.flags.enableSiYuanExport) {
    await runExportSiYuanCommand();
  }

  console.log(`Pipeline complete`);
  console.log(`Morning: ${morning.filePath}`);
  console.log(`Evening: ${evening.filePath}`);
  console.log(`Knowledge: ${knowledge.filePath}`);
}
