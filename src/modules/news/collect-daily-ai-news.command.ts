import { loadConfig } from "../../app/config.js";
import { logRun } from "../../shared/log.js";
import { DailyAiNewsCollector } from "./daily-ai-news-collector.js";
import { DailyAiNewsService } from "./daily-ai-news.service.js";

export async function runCollectDailyAiNewsCommand(): Promise<void> {
  const config = loadConfig();
  const service = new DailyAiNewsService(config);
  const requestPath = service.latestPendingRequestPath();

  if (!requestPath) {
    console.log("No pending daily AI news request.");
    return;
  }

  const collector = new DailyAiNewsCollector(config);
  const result = await collector.collectFromPendingRequest(requestPath);

  if (!result.packetPath) {
    logRun(config, `daily ai news collection skipped reason=${result.skippedReason || "unknown"}`);
    console.log(`Daily AI news collection skipped: ${result.skippedReason || "unknown"}`);
    return;
  }

  logRun(config, `daily ai news packet collected ${result.packetPath}`);
  console.log(`Daily AI news packet: ${result.packetPath}`);
  console.log(`Count: ${result.count}`);
  console.log(`Official: ${result.officialCount}`);
  console.log(`Major media: ${result.majorMediaCount}`);
  console.log(`CN: ${result.cnCount}`);
}
