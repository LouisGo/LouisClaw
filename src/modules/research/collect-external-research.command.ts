import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { ExternalResearchService } from "./external-research.service.js";

export function runCollectExternalResearchCommand(): void {
  const config = loadConfig();
  const service = new ExternalResearchService(config, new ItemRepository(config));
  const requestPath = service.latestPendingRequestPath();

  if (!requestPath) {
    console.log("No pending external research request.");
    return;
  }

  console.log("This task is fulfilled by OpenClaw, not by local code execution.");
  console.log(`Pending request: ${requestPath}`);
  console.log("Use the OpenClaw collector schedule or the equivalent guided agent prompt to fulfill it.");
}
