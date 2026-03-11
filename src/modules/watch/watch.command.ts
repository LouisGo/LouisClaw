import chokidar from "chokidar";
import { loadConfig } from "../../app/config.js";
import { logRun } from "../../shared/log.js";
import { runProcessCommand } from "../process/process.command.js";

export function runWatchCommand(): void {
  const config = loadConfig();

  console.log(`Watching inbox: ${config.paths.inbox}`);
  logRun(config, `watching inbox ${config.paths.inbox}`);

  const watcher = chokidar.watch(config.paths.inbox, {
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on("add", async () => {
    await runProcessCommand();
  });
}
