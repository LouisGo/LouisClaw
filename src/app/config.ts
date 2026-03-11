import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { ensureDir } from "../shared/fs.js";

dotenv.config();

const envSchema = z.object({
  CLASSIFIER_MODE: z.enum(["auto", "heuristic", "llm"]).optional(),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().optional(),
  WORKSPACE_ROOT: z.string().optional(),
  SIYUAN_EXPORT_ROOT: z.string().optional(),
  ENABLE_SIYUAN_EXPORT: z.enum(["true", "false"]).optional(),
  EXPORT_ROOT: z.string().optional(),
  ENABLE_IM_ATTACHMENT_EXPORT: z.enum(["true", "false"]).optional()
});

export interface AppConfig {
  workspaceRoot: string;
  flags: {
    enableSiYuanExport: boolean;
    enableImAttachmentExport: boolean;
  };
  ai: {
    classifierMode: "auto" | "heuristic" | "llm";
    model?: string;
    apiKey?: string;
    baseUrl: string;
  };
  paths: {
    data: string;
    inbox: string;
    raw: string;
    items: string;
    digests: string;
    exports: string;
    exportDigests: string;
    exportItems: string;
    exportFollowUps: string;
    state: string;
    logs: string;
    siyuanExportRoot?: string;
  };
}

export function loadConfig(): AppConfig {
  const env = envSchema.parse(process.env);
  const workspaceRoot = path.resolve(env.WORKSPACE_ROOT || process.cwd());
  const dataRoot = path.join(workspaceRoot, "data");
  const exportsRoot = path.resolve(workspaceRoot, env.EXPORT_ROOT || "data/exports");

  const config: AppConfig = {
    workspaceRoot,
    flags: {
      enableSiYuanExport: env.ENABLE_SIYUAN_EXPORT === "true",
      enableImAttachmentExport: env.ENABLE_IM_ATTACHMENT_EXPORT !== "false"
    },
    ai: {
      classifierMode: env.CLASSIFIER_MODE || "auto",
      model: env.AI_MODEL || env.OPENAI_MODEL || "gpt-5.4",
      apiKey: env.AI_API_KEY || env.OPENAI_API_KEY,
      baseUrl: env.AI_BASE_URL || "https://api.openai.com/v1"
    },
    paths: {
      data: dataRoot,
      inbox: path.join(dataRoot, "inbox"),
      raw: path.join(dataRoot, "raw"),
      items: path.join(dataRoot, "items"),
      digests: path.join(dataRoot, "digests"),
      exports: exportsRoot,
      exportDigests: path.join(exportsRoot, "digests"),
      exportItems: path.join(exportsRoot, "items"),
      exportFollowUps: path.join(exportsRoot, "follow-ups"),
      state: path.join(dataRoot, "state"),
      logs: path.join(dataRoot, "logs"),
      siyuanExportRoot: env.SIYUAN_EXPORT_ROOT ? path.resolve(workspaceRoot, env.SIYUAN_EXPORT_ROOT) : undefined
    }
  };

  ensureDirectories(config);
  return config;
}

function ensureDirectories(config: AppConfig): void {
  ensureDir(config.paths.data);
  ensureDir(config.paths.inbox);
  ensureDir(config.paths.raw);
  ensureDir(config.paths.items);
  ensureDir(config.paths.digests);
  ensureDir(config.paths.exports);
  ensureDir(config.paths.exportDigests);
  ensureDir(config.paths.exportItems);
  ensureDir(config.paths.exportFollowUps);
  ensureDir(config.paths.state);
  ensureDir(config.paths.logs);
}
