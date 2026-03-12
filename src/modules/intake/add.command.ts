import path from "node:path";
import { nowIso } from "../../shared/time.js";
import { loadConfig } from "../../app/config.js";
import { IntakeInput } from "../../domain/item.js";
import { readTextFile } from "../../shared/fs.js";
import { IntakeService } from "./intake.service.js";
import { intakeInputSchema } from "./intake.schema.js";

export interface AddCommandOptions {
  type: IntakeInput["content_type"];
  content?: string;
  file?: string;
  source?: string;
  device?: string;
  url?: string;
  title?: string;
}

export function runAddCommand(options: AddCommandOptions): void {
  const hasContent = typeof options.content === "string";
  const hasFile = typeof options.file === "string";

  if (hasContent === hasFile) {
    throw new Error("请且仅请提供 --content 或 --file 其中之一");
  }

  const config = loadConfig();
  const service = new IntakeService(config);
  const filePath = hasFile ? path.resolve(options.file as string) : undefined;
  const rawContent = hasContent ? options.content : readTextFile(filePath as string);
  const input = intakeInputSchema.parse({
    source: options.source || "manual",
    device: options.device || "local",
    capture_time: nowIso(),
    content_type: options.type,
    raw_content: rawContent,
    url: options.url,
    title: options.title || (filePath ? path.basename(filePath) : undefined)
  });

  const landingRecordPath = service.enqueue(input, config.paths.landing);
  console.log(`Landing record written: ${landingRecordPath}`);
}
