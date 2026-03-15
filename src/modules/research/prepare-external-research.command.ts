import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { logRun } from "../../shared/log.js";
import { ExternalResearchService } from "./external-research.service.js";

export function runPrepareExternalResearchCommand(): void {
  const config = loadConfig();
  const service = new ExternalResearchService(config, new ItemRepository(config));
  const result = service.prepareMorningTopicRequest();

  if (!result.requestPath) {
    logRun(config, `external research request skipped reason=${result.skippedReason || "unknown"}`);
    console.log(`External research request skipped: ${result.skippedReason || "unknown"}`);
    if (result.topicLabel) {
      console.log(`Topic: ${result.topicLabel}`);
      console.log(`Local items: ${result.localItemCount}`);
    }
    if (result.outputPath) {
      console.log(`Existing packet: ${result.outputPath}`);
    }
    return;
  }

  logRun(config, `external research request prepared ${result.requestPath}`);
  console.log(`External research request: ${result.requestPath}`);
  console.log(`Topic: ${result.topicLabel}`);
  console.log(`Local items: ${result.localItemCount}`);
  console.log(`Target packet: ${result.outputPath}`);
}
