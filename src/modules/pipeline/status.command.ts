import path from "node:path";
import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { LandingFileService } from "../intake/landing-file.service.js";
import { dateStamp } from "../../shared/time.js";
import { fileExists } from "../../shared/fs.js";

export function runStatusCommand(): void {
  const config = loadConfig();
  const itemRepository = new ItemRepository(config);
  const landingFileService = new LandingFileService(config);
  const today = dateStamp();
  const items = itemRepository.loadAll().filter((item) => item.capture_time.startsWith(today));
  const digestPath = path.join(config.paths.digests, `${today}-daily-digest.md`);
  const landingOverview = landingFileService.overview();

  const counts = {
    total: items.length,
    drop: items.filter((item) => item.decision === "drop").length,
    archive: items.filter((item) => item.decision === "archive").length,
    digest: items.filter((item) => item.decision === "digest").length,
    follow_up: items.filter((item) => item.decision === "follow_up").length
  };

  console.log(`Date: ${today}`);
  console.log(`Items total: ${counts.total}`);
  console.log(`Drop: ${counts.drop}`);
  console.log(`Archive: ${counts.archive}`);
  console.log(`Digest: ${counts.digest}`);
  console.log(`Follow up: ${counts.follow_up}`);
  console.log(`Landing total: ${landingOverview.total}`);
  console.log(`Landing supported: ${landingOverview.supported}`);
  console.log(`Landing ignored: ${landingOverview.ignored}`);
  console.log(`Digest exists: ${fileExists(digestPath) ? "yes" : "no"}`);
  if (fileExists(digestPath)) {
    console.log(`Digest path: ${digestPath}`);
  }
}
