import { runDigestCommand } from "../digest/digest.command.js";
import { runPullMarkdownSourcesCommand } from "../intake/pull-markdown.command.js";
import { runCollectDailyAiNewsCommand } from "../news/collect-daily-ai-news.command.js";
import { runEnrichDailyAiNewsCommand } from "../news/enrich-daily-ai-news.command.js";
import { runPrepareDailyAiNewsCommand } from "../news/prepare-daily-ai-news.command.js";
import { runProcessCommand } from "../process/process.command.js";
import { runStatusCommand } from "../pipeline/status.command.js";
import { runPipelineCommand } from "../pipeline/run.command.js";
import { runNightlySummaryCommand } from "../pipeline/nightly-summary.command.js";
import { runCollectExternalResearchCommand } from "../research/collect-external-research.command.js";
import { runPrepareExternalResearchCommand } from "../research/prepare-external-research.command.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";
import { runPullSiYuanInboxCommand } from "../siyuan/pull-siyuan-inbox.command.js";
import { runBuildMorningTopicCommand } from "../synthesis/build-morning-topic.command.js";

export type TaskId =
  | "pull_markdown_sources"
  | "pull_siyuan_inbox"
  | "status_overview"
  | "process_inbox"
  | "prepare_daily_ai_news"
  | "collect_daily_ai_news"
  | "enrich_daily_ai_news"
  | "prepare_external_research"
  | "collect_external_research"
  | "build_morning_topic"
  | "build_digest"
  | "nightly_summary"
  | "daily_pipeline"
  | "export_siyuan";

export type TaskCostClass = "low" | "medium";

export interface TaskDefinition {
  id: TaskId;
  description: string;
  defaultSchedule: string;
  dependsOn: TaskId[];
  costClass: TaskCostClass;
  run: () => Promise<void> | void;
}

const TASKS: Record<TaskId, TaskDefinition> = {
  pull_markdown_sources: {
    id: "pull_markdown_sources",
    description: "Read configured markdown source files and land new appended content",
    defaultSchedule: "every 1h",
    dependsOn: [],
    costClass: "low",
    run: () => runPullMarkdownSourcesCommand()
  },
  pull_siyuan_inbox: {
    id: "pull_siyuan_inbox",
    description: "Read the configured SiYuan inbox doc and land new appended content",
    defaultSchedule: "every 1h",
    dependsOn: [],
    costClass: "low",
    run: async () => runPullSiYuanInboxCommand()
  },
  status_overview: {
    id: "status_overview",
    description: "Show workflow status and landing overview",
    defaultSchedule: "manual / every 1h",
    dependsOn: [],
    costClass: "low",
    run: () => runStatusCommand()
  },
  process_inbox: {
    id: "process_inbox",
    description: "Move landing files into inbox and process queued inputs",
    defaultSchedule: "every 1h",
    dependsOn: ["pull_markdown_sources", "pull_siyuan_inbox"],
    costClass: "low",
    run: async () => runProcessCommand()
  },
  prepare_daily_ai_news: {
    id: "prepare_daily_ai_news",
    description: "Prepare the daily AI news request for the morning report using a trusted-source whitelist",
    defaultSchedule: "daily pre-morning-topic / manual",
    dependsOn: [],
    costClass: "low",
    run: () => runPrepareDailyAiNewsCommand()
  },
  collect_daily_ai_news: {
    id: "collect_daily_ai_news",
    description: "Collect the daily AI news packet from fixed trusted feeds and whitelist entry pages",
    defaultSchedule: "manual / optional automation",
    dependsOn: ["prepare_daily_ai_news"],
    costClass: "medium",
    run: () => runCollectDailyAiNewsCommand()
  },
  enrich_daily_ai_news: {
    id: "enrich_daily_ai_news",
    description: "LLM enrichment layer for daily AI news titles and wording after deterministic collection",
    defaultSchedule: "manual / optional automation",
    dependsOn: ["collect_daily_ai_news"],
    costClass: "medium",
    run: () => runEnrichDailyAiNewsCommand()
  },
  prepare_external_research: {
    id: "prepare_external_research",
    description: "Prepare a bounded external research request only when local morning-topic materials are insufficient",
    defaultSchedule: "daily pre-morning-topic / manual",
    dependsOn: ["process_inbox"],
    costClass: "low",
    run: () => runPrepareExternalResearchCommand()
  },
  collect_external_research: {
    id: "collect_external_research",
    description: "Bounded OpenClaw web research collector for a prepared research request",
    defaultSchedule: "manual / optional automation",
    dependsOn: ["prepare_external_research"],
    costClass: "medium",
    run: () => runCollectExternalResearchCommand()
  },
  build_morning_topic: {
    id: "build_morning_topic",
    description: "Generate the morning deep-read topic report from recent local materials and the daily trusted AI news module",
    defaultSchedule: "daily morning",
    dependsOn: ["process_inbox"],
    costClass: "medium",
    run: async () => runBuildMorningTopicCommand()
  },
  build_digest: {
    id: "build_digest",
    description: "Generate digest and export digest attachments from processed items",
    defaultSchedule: "daily",
    dependsOn: ["process_inbox"],
    costClass: "medium",
    run: () => runDigestCommand()
  },
  nightly_summary: {
    id: "nightly_summary",
    description: "Run the nightly summary pipeline and publish the daily digest artifacts",
    defaultSchedule: "daily evening",
    dependsOn: ["process_inbox", "build_digest", "export_siyuan"],
    costClass: "medium",
    run: async () => runNightlySummaryCommand()
  },
  daily_pipeline: {
    id: "daily_pipeline",
    description: "Run the full local pipeline: process, digest, and exports",
    defaultSchedule: "daily / manual rerun",
    dependsOn: ["process_inbox", "build_digest"],
    costClass: "medium",
    run: async () => runPipelineCommand()
  },
  export_siyuan: {
    id: "export_siyuan",
    description: "Export processed items into the incremental SiYuan output root",
    defaultSchedule: "after build_digest",
    dependsOn: ["build_digest"],
    costClass: "low",
    run: () => runExportSiYuanCommand()
  }
};

export function listTaskDefinitions(): TaskDefinition[] {
  return Object.values(TASKS);
}

export function getTaskDefinition(taskId: string): TaskDefinition | undefined {
  return TASKS[taskId as TaskId];
}

export function assertTaskDefinition(taskId: string): TaskDefinition {
  const task = getTaskDefinition(taskId);

  if (!task) {
    const available = listTaskDefinitions().map((entry) => entry.id).join(", ");
    throw new Error(`未知任务：${taskId}。可用任务：${available}`);
  }

  return task;
}
