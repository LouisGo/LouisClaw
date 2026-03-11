import { nowIso } from "../../shared/time.js";
import { loadConfig } from "../../app/config.js";
import { IntakeInput } from "../../domain/item.js";
import { IntakeService } from "./intake.service.js";
import { intakeInputSchema } from "./intake.schema.js";

export interface AddCommandOptions {
  type: IntakeInput["content_type"];
  content: string;
  source?: string;
  device?: string;
  url?: string;
  title?: string;
}

export function runAddCommand(options: AddCommandOptions): void {
  const config = loadConfig();
  const service = new IntakeService(config);
  const input = intakeInputSchema.parse({
    source: options.source || "manual",
    device: options.device || "local",
    capture_time: nowIso(),
    content_type: options.type,
    raw_content: options.content,
    url: options.url,
    title: options.title
  });

  const filePath = service.enqueue(input);
  console.log(`Inbox record written: ${filePath}`);
}
