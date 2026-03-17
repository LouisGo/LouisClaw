import { loadConfig } from "../../app/config.js";
import { logRun } from "../../shared/log.js";
import { DailyAiNewsEnrichmentService } from "./daily-ai-news-enrichment.service.js";

export async function runEnrichDailyAiNewsCommand(): Promise<void> {
  const config = loadConfig();
  const service = new DailyAiNewsEnrichmentService(config);
  const result = await service.enrichLatestPendingPacket();

  if (!result.packetPath) {
    console.log("No pending daily AI news packet for enrichment.");
    return;
  }

  if (result.skippedReason) {
    logRun(config, `daily ai news enrich skipped reason=${result.skippedReason}`);
    console.log(`Daily AI news enrich skipped: ${result.skippedReason}`);
    console.log(`Packet: ${result.packetPath}`);
    return;
  }

  logRun(config, `daily ai news enriched ${result.packetPath} translated=${result.translatedCount}`);
  console.log(`Daily AI news enriched: ${result.packetPath}`);
  console.log(`Translated: ${result.translatedCount}/${result.pendingCount}`);
  console.log(`Completed: ${result.completed ? "yes" : "no"}`);
}
