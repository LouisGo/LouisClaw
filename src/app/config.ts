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
  SIYUAN_INBOX_NOTEBOOK: z.string().min(1).optional(),
  SIYUAN_INBOX_HPATH: z.string().min(1).optional(),
  SIYUAN_INBOX_TITLE: z.string().min(1).optional(),
  SIYUAN_INBOX_SOURCE: z.string().min(1).optional(),
  SIYUAN_INBOX_DEVICE: z.string().min(1).optional(),
  MORNING_TOPIC_SUBSCRIPTIONS: z.string().optional(),
  MORNING_TOPIC_LOOKBACK_DAYS: z.coerce.number().int().min(1).max(30).optional(),
  EXTERNAL_RESEARCH_ENABLED: z.enum(["true", "false"]).optional(),
  EXTERNAL_RESEARCH_MAX_SOURCES: z.coerce.number().int().min(1).max(12).optional(),
  EXTERNAL_RESEARCH_MIN_LOCAL_ITEMS: z.coerce.number().int().min(0).max(20).optional(),
  ACTIVE_ITEM_MAX_AGE_DAYS: z.coerce.number().int().min(1).max(365).optional(),
  MORNING_TOPIC_MAX_ITEMS: z.coerce.number().int().min(1).max(20).optional(),
  OPENCLAW_CONTEXT_MAX_ITEMS: z.coerce.number().int().min(1).max(30).optional(),
  OPENCLAW_CONTEXT_MAX_PACKETS: z.coerce.number().int().min(1).max(5).optional(),
  OPENCLAW_CONTEXT_MAX_DIGESTS: z.coerce.number().int().min(1).max(5).optional(),
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
  morningTopic: {
    subscriptions: string[];
    lookbackDays: number;
  };
  externalResearch: {
    enabled: boolean;
    maxSources: number;
    minLocalItems: number;
  };
  activeWindow: {
    maxAgeDays: number;
    morningTopicMaxItems: number;
  };
  openclawContext: {
    maxItems: number;
    maxPackets: number;
    maxDigests: number;
  };
  paths: {
    data: string;
    research: string;
    researchRequests: string;
    researchPackets: string;
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
    inbox: {
      notebook?: string;
      hPath?: string;
      title?: string;
      source: string;
      device: string;
    };
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
    morningTopic: {
      subscriptions: parseStringList(env.MORNING_TOPIC_SUBSCRIPTIONS),
      lookbackDays: env.MORNING_TOPIC_LOOKBACK_DAYS || 7
    },
    externalResearch: {
      enabled: env.EXTERNAL_RESEARCH_ENABLED === "true",
      maxSources: env.EXTERNAL_RESEARCH_MAX_SOURCES || 6,
      minLocalItems: env.EXTERNAL_RESEARCH_MIN_LOCAL_ITEMS || 3
    },
    activeWindow: {
      maxAgeDays: env.ACTIVE_ITEM_MAX_AGE_DAYS || 30,
      morningTopicMaxItems: env.MORNING_TOPIC_MAX_ITEMS || 8
    },
    openclawContext: {
      maxItems: env.OPENCLAW_CONTEXT_MAX_ITEMS || 12,
      maxPackets: env.OPENCLAW_CONTEXT_MAX_PACKETS || 1,
      maxDigests: env.OPENCLAW_CONTEXT_MAX_DIGESTS || 1
    },
    siyuan: {
      driver: env.SIYUAN_EXPORT_DRIVER || "filesystem",
      apiUrl: env.SIYUAN_API_URL || "http://127.0.0.1:6806",
      apiToken: env.SIYUAN_API_TOKEN,
      notebook: env.SIYUAN_API_NOTEBOOK || "AI-Flow",
      validate: env.SIYUAN_EXPORT_VALIDATE === "true",
      inbox: {
        notebook: env.SIYUAN_INBOX_NOTEBOOK,
        hPath: normalizeSiYuanHPath(env.SIYUAN_INBOX_HPATH),
        title: env.SIYUAN_INBOX_TITLE,
        source: env.SIYUAN_INBOX_SOURCE || "siyuan_inbox",
        device: env.SIYUAN_INBOX_DEVICE || "siyuan"
      }
    },
    paths: {
      data: dataRoot,
      research: path.join(dataRoot, "research"),
      researchRequests: path.join(dataRoot, "research", "requests"),
      researchPackets: path.join(dataRoot, "research", "packets"),
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

function normalizeSiYuanHPath(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function ensureDirectories(config: AppConfig): void {
  ensureDir(config.paths.data);
  ensureDir(config.paths.research);
  ensureDir(config.paths.researchRequests);
  ensureDir(config.paths.researchPackets);
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

function parseStringList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[")) {
    return z.array(z.string().min(1)).parse(JSON.parse(trimmed)).map((entry) => entry.trim()).filter(Boolean);
  }

  return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean);
}
