import { listFiles, removeFile } from "../../shared/fs.js";
import { logRun } from "../../shared/log.js";
import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { IntakeService } from "../intake/intake.service.js";
import { InboxFileService } from "../intake/inbox-file.service.js";
import { LandingFileService } from "../intake/landing-file.service.js";
import { ClassifyService } from "./classify.service.js";
import { PreprocessService } from "./preprocess.service.js";

export interface ProcessCommandOptions {
  skipLandingFlush?: boolean;
}

export async function runProcessCommand(options: ProcessCommandOptions = {}): Promise<void> {
  const config = loadConfig();
  const intakeService = new IntakeService(config);
  const landingFileService = new LandingFileService(config);
  const itemRepository = new ItemRepository(config);
  const stateRepository = new StateRepository(config);
  const inboxFileService = new InboxFileService();
  const preprocessService = new PreprocessService(stateRepository);
  const classifyService = new ClassifyService(config);

  if (!options.skipLandingFlush) {
    const landingResult = landingFileService.flushToInbox();
    landingResult.moved.forEach((filePath) => logRun(config, `landed into inbox ${filePath}`));
    landingResult.ignored.forEach((filePath) => logRun(
      config,
      `ignored landing file ${filePath} supported=${landingFileService.supportedExtensions().join(",")}`
    ));
  }

  const files = [
    ...listFiles(config.paths.inbox, ".json"),
    ...listFiles(config.paths.inbox, ".md"),
    ...listFiles(config.paths.inbox, ".txt")
  ].sort();

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
