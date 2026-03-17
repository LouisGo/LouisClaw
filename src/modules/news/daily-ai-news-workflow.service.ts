import { AppConfig } from "../../app/config.js";
import { fileExists } from "../../shared/fs.js";
import { DailyAiNewsCollector } from "./daily-ai-news-collector.js";
import { DailyAiNewsEnrichmentService, DailyAiNewsEnrichResult } from "./daily-ai-news-enrichment.service.js";
import { DailyAiNewsService, DailyAiNewsPrepareResult } from "./daily-ai-news.service.js";

export interface DailyAiNewsWorkflowResult {
  prepare: DailyAiNewsPrepareResult;
  collectedCount: number;
  packetPath?: string;
  collectSkippedReason?: string;
  enrich?: DailyAiNewsEnrichResult;
}

export class DailyAiNewsWorkflowService {
  constructor(private readonly config: AppConfig) {}

  async ensureReadyForMorningTopic(): Promise<DailyAiNewsWorkflowResult> {
    const service = new DailyAiNewsService(this.config);
    const prepare = service.prepareDailyRequest();

    if (prepare.skippedReason === "ai_news_disabled") {
      return {
        prepare,
        collectedCount: 0
      };
    }

    let packetPath = prepare.outputPath && fileExists(prepare.outputPath) ? prepare.outputPath : undefined;
    let collectedCount = 0;
    let collectSkippedReason: string | undefined;

    const requestPath = prepare.requestPath || service.latestPendingRequestPath();
    if (requestPath) {
      const collector = new DailyAiNewsCollector(this.config);
      const result = await collector.collectFromPendingRequest(requestPath);
      packetPath = result.packetPath || packetPath;
      collectedCount = result.count;
      collectSkippedReason = result.skippedReason;
    }

    const enrich = packetPath ? await new DailyAiNewsEnrichmentService(this.config).enrichPacket(packetPath) : undefined;

    return {
      prepare,
      collectedCount,
      packetPath,
      collectSkippedReason,
      enrich
    };
  }
}
