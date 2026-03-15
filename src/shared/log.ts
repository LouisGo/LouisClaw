import path from "node:path";
import { AppConfig } from "../app/config.js";
import { appendTextFile } from "./fs.js";
import { dateStamp, formatLocalDateTime, nowIso } from "./time.js";

export function logRun(config: AppConfig, message: string): void {
  appendTextFile(path.join(config.paths.logs, `${dateStamp()}.log`), `[${formatLocalDateTime(nowIso())}] ${message}\n`);
}
