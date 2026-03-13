import { AddCommandOptions, runAddCommand } from "./add.command.js";

export type WebIntakeCommandOptions = Omit<AddCommandOptions, "type"> & {
  url: string;
};

export function runWebIntakeCommand(options: WebIntakeCommandOptions): void {
  if (!options.url) {
    throw new Error("请提供 --url");
  }

  runAddCommand({
    type: "link",
    content: options.content,
    file: options.file,
    source: options.source || "openclaw",
    device: options.device || "webchat",
    url: options.url,
    title: options.title
  });
}
