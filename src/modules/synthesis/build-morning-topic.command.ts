import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";
import { MorningTopicService } from "./morning-topic.service.js";

export async function runBuildMorningTopicCommand(): Promise<void> {
  const config = loadConfig();
  const service = new MorningTopicService(config, new ItemRepository(config));
  const result = service.build();

  if (!result.filePath || !result.title) {
    logRun(config, `morning topic skipped reason=${result.skippedReason || "unknown"}`);
    console.log(`Morning topic skipped: ${result.skippedReason || "unknown"}`);
    return;
  }

  logRun(config, `morning topic generated ${result.filePath}`);
  console.log(`Morning topic: ${result.title}`);
  console.log(`Source type: ${result.sourceType}`);
  console.log(`Items: ${result.itemCount}`);
  console.log(`Path: ${result.filePath}`);

  if (config.flags.enableSiYuanExport) {
    await runExportSiYuanCommand();
  }
}
