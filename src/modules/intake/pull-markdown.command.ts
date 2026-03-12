import { loadConfig } from "../../app/config.js";
import { StateRepository } from "../../infra/storage/state-repository.js";
import { IntakeService } from "./intake.service.js";
import { MarkdownSourcePullService } from "./markdown-source-pull.service.js";

export function runPullMarkdownSourcesCommand(): void {
  const config = loadConfig();
  const service = new MarkdownSourcePullService(
    config,
    new StateRepository(config),
    new IntakeService(config)
  );

  const result = service.run();
  console.log(`Seeded sources: ${result.seeded.length}`);
  console.log(`Imported landing records: ${result.imported.length}`);
  console.log(`Skipped sources: ${result.skipped.length}`);
  result.seeded.forEach((entry) => console.log(`Seeded: ${entry}`));
  result.imported.forEach((entry) => console.log(`Imported: ${entry}`));
  result.skipped.forEach((entry) => console.log(`Skipped: ${entry}`));
}
