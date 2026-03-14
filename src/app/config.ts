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
  SIYUAN_EXPORT_DRIVER: z.enum(["filesystem", "api"]).optional(),
  SIYUAN_API_URL: z.string().url().optional(),
  SIYUAN_API_TOKEN: z.string().optional(),
  SIYUAN_API_NOTEBOOK: z.string().min(1).optional(),
  SIYUAN_EXPORT_VALIDATE: z.enum(["true", "false"]).optional(),
  EXPORT_ROOT: z.string().optional(),
  ENABLE_IM_ATTACHMENT_EXPORT: z.enum(["true", "false"]).optional(),
  MARKDOWN_PULL_SOURCES: z.string().optional()
});

const markdownSourceSchema = z.object({
  path: z.string().min(1),
  source: z.string().min(1).optional(),
  device: z.string().min(1).optional(),
  title: z.string().min(1).optional()
});

export interface MarkdownPullSourceConfig {
  path: string;
  source: string;
  device: string;
  title?: string;
}

export interface AppConfig {
  workspaceRoot: string;
  flags: {
    enableSiYuanExport: boolean;
    enableImAttachmentExport: boolean;
  };
  markdownPull: {
    sources: MarkdownPullSourceConfig[];
  };
  ai: {
    classifierMode: "auto" | "heuristic" | "llm";
    model?: string;
    apiKey?: string;
    baseUrl: string;
  };
  paths: {
    data: string;
    landing: string;
    inbox: string;
    raw: string;
    items: string;
    digests: string;
    exports: string;
    exportDigests: string;
    exportItems: string;
    exportFollowUps: string;
    exportSynthesis: string;
    state: string;
    logs: string;
    siyuanExportRoot?: string;
  };
  siyuan: {
    driver: "filesystem" | "api";
    apiUrl: string;
    apiToken?: string;
    notebook: string;
    validate: boolean;
  };
}

export function loadConfig(): AppConfig {
  const env = envSchema.parse(process.env);
  const workspaceRoot = path.resolve(env.WORKSPACE_ROOT || process.cwd());
  const dataRoot = path.join(workspaceRoot, "data");
  const exportsRoot = path.resolve(workspaceRoot, env.EXPORT_ROOT || "data/exports");
  const markdownPullSources = parseMarkdownPullSources(env.MARKDOWN_PULL_SOURCES, workspaceRoot);

  const config: AppConfig = {
    workspaceRoot,
    flags: {
      enableSiYuanExport: env.ENABLE_SIYUAN_EXPORT === "true",
      enableImAttachmentExport: env.ENABLE_IM_ATTACHMENT_EXPORT !== "false"
    },
    markdownPull: {
      sources: markdownPullSources
    },
    ai: {
      classifierMode: env.CLASSIFIER_MODE || "auto",
      model: env.AI_MODEL || env.OPENAI_MODEL || "gpt-5.4",
      apiKey: env.AI_API_KEY || env.OPENAI_API_KEY,
      baseUrl: env.AI_BASE_URL || "https://api.openai.com/v1"
    },
    siyuan: {
      driver: env.SIYUAN_EXPORT_DRIVER || "filesystem",
      apiUrl: env.SIYUAN_API_URL || "http://127.0.0.1:6806",
      apiToken: env.SIYUAN_API_TOKEN,
      notebook: env.SIYUAN_API_NOTEBOOK || "AI-Flow",
      validate: env.SIYUAN_EXPORT_VALIDATE === "true"
    },
    paths: {
      data: dataRoot,
      landing: path.join(dataRoot, "landing"),
      inbox: path.join(dataRoot, "inbox"),
      raw: path.join(dataRoot, "raw"),
      items: path.join(dataRoot, "items"),
      digests: path.join(dataRoot, "digests"),
      exports: exportsRoot,
      exportDigests: path.join(exportsRoot, "digests"),
      exportItems: path.join(exportsRoot, "items"),
      exportFollowUps: path.join(exportsRoot, "follow-ups"),
      exportSynthesis: path.join(exportsRoot, "synthesis"),
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
  ensureDir(config.paths.landing);
  ensureDir(config.paths.inbox);
  ensureDir(config.paths.raw);
  ensureDir(config.paths.items);
  ensureDir(config.paths.digests);
  ensureDir(config.paths.exports);
  ensureDir(config.paths.exportDigests);
  ensureDir(config.paths.exportItems);
  ensureDir(config.paths.exportFollowUps);
  ensureDir(config.paths.exportSynthesis);
  ensureDir(config.paths.state);
  ensureDir(config.paths.logs);
}

function parseMarkdownPullSources(raw: string | undefined, workspaceRoot: string): MarkdownPullSourceConfig[] {
  if (!raw) {
    return [];
  }

  const parsed = z.array(markdownSourceSchema).parse(JSON.parse(raw));

  return parsed.map((entry) => ({
    path: path.resolve(workspaceRoot, entry.path),
    source: entry.source || "markdown_pull",
    device: entry.device || "local",
    title: entry.title
  }));
}
