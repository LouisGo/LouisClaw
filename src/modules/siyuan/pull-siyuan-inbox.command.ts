import { loadConfig } from "../../app/config.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { logRun } from "../../shared/log.js";
import { IntakeService } from "../intake/intake.service.js";
import { SiYuanApiClient } from "./siyuan-api.client.js";
import { SiYuanInboxPullService } from "./siyuan-inbox-pull.service.js";

export async function runPullSiYuanInboxCommand(): Promise<void> {
  const config = loadConfig();
  const inbox = config.siyuan.inbox;

  if (!inbox.notebook || !inbox.hPath) {
    console.log("SiYuan inbox pull disabled: set SIYUAN_INBOX_NOTEBOOK and SIYUAN_INBOX_HPATH to enable it.");
    return;
  }

  if (!config.siyuan.apiToken) {
    throw new Error("缺少 SIYUAN_API_TOKEN");
  }

  const service = new SiYuanInboxPullService(
    config,
    new StateRepository(config),
    new IntakeService(config),
    new SiYuanApiClient(config.siyuan.apiUrl, config.siyuan.apiToken)
  );

  const result = await service.run();
  logRun(config, `siyuan inbox pull seeded=${result.seeded.length} imported=${result.imported.length} skipped=${result.skipped.length}`);
  console.log(`Seeded sources: ${result.seeded.length}`);
  console.log(`Imported landing records: ${result.imported.length}`);
  console.log(`Skipped sources: ${result.skipped.length}`);
  result.seeded.forEach((entry) => console.log(`Seeded: ${entry}`));
  result.imported.forEach((entry) => console.log(`Imported: ${entry}`));
  result.skipped.forEach((entry) => console.log(`Skipped: ${entry}`));
}
