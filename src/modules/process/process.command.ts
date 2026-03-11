import { listFiles, removeFile } from "../../shared/fs.js";
import { logRun } from "../../shared/log.js";
import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { IntakeService } from "../intake/intake.service.js";
import { InboxFileService } from "../intake/inbox-file.service.js";
import { ClassifyService } from "./classify.service.js";
import { PreprocessService } from "./preprocess.service.js";

export async function runProcessCommand(): Promise<void> {
  const config = loadConfig();
  const intakeService = new IntakeService(config);
  const itemRepository = new ItemRepository(config);
  const stateRepository = new StateRepository(config);
  const inboxFileService = new InboxFileService();
  const preprocessService = new PreprocessService(stateRepository);
  const classifyService = new ClassifyService(config);

  const files = [...listFiles(config.paths.inbox, ".json"), ...listFiles(config.paths.inbox, ".md")].sort();

  for (const filePath of files) {
    const input = inboxFileService.parse(filePath);
    const item = intakeService.buildItem(input);
    intakeService.saveRawSnapshot(item);
    const preprocessed = preprocessService.run(item);
    const classified = await classifyService.run(preprocessed);
    itemRepository.save(classified);
    removeFile(filePath);
    logRun(config, `processed ${classified.id} decision=${classified.decision}`);
    console.log(`Processed: ${classified.id} -> ${classified.decision}`);
  }
}
