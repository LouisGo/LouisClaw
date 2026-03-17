import { loadConfig } from "../../app/config.js";
import { logRun } from "../../shared/log.js";
import { DailyAiNewsService } from "./daily-ai-news.service.js";

export function runPrepareDailyAiNewsCommand(): void {
  const config = loadConfig();
  const service = new DailyAiNewsService(config);
  const result = service.prepareDailyRequest();

  if (!result.requestPath) {
    logRun(config, `daily ai news request skipped reason=${result.skippedReason || "unknown"}`);
    console.log(`Daily AI news request skipped: ${result.skippedReason || "unknown"}`);
    if (result.outputPath) {
      console.log(`Existing packet: ${result.outputPath}`);
    }
    return;
  }

  logRun(config, `daily ai news request prepared ${result.requestPath}`);
  console.log(`Daily AI news request: ${result.requestPath}`);
  console.log(`Window: ${result.windowStart} -> ${result.windowEnd}`);
  console.log(`Requested count: ${result.requestedCount}`);
  console.log(`Target packet: ${result.outputPath}`);
}
