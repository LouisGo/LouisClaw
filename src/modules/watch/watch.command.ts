import chokidar from "chokidar";
import { loadConfig } from "../../app/config.js";
import { logRun } from "../../shared/log.js";
import { LandingFileService } from "../intake/landing-file.service.js";
import { runProcessCommand } from "../process/process.command.js";

export function runWatchCommand(): void {
  const config = loadConfig();
  const landingFileService = new LandingFileService(config);

  console.log(`Watching landing: ${config.paths.landing}`);
  console.log(`Watching inbox: ${config.paths.inbox}`);
  logRun(config, `watching landing ${config.paths.landing}`);
  logRun(config, `watching inbox ${config.paths.inbox}`);

  const watcher = chokidar.watch([config.paths.landing, config.paths.inbox], {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on("add", async (filePath) => {
    if (filePath.startsWith(config.paths.landing)) {
      if (!landingFileService.isSupported(filePath)) {
        console.warn(`Ignored landing file: ${filePath}`);
        logRun(
          config,
          `ignored landing file ${filePath} supported=${landingFileService.supportedExtensions().join(",")}`
        );
        return;
      }

      const movedFilePath = landingFileService.moveFileToInbox(filePath);
      console.log(`Landed into inbox: ${movedFilePath}`);
      logRun(config, `landed into inbox ${movedFilePath}`);
      return;
    }

    await runProcessCommand({ skipLandingFlush: true });
  });
}
