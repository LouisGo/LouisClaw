import { runPullMarkdownSourcesCommand } from "../intake/pull-markdown.command.js";
import { runProcessCommand } from "../process/process.command.js";
import { runStatusCommand } from "../pipeline/status.command.js";
import { runPipelineCommand } from "../pipeline/run.command.js";
import { runNightlySummaryCommand } from "../pipeline/nightly-summary.command.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";
import { runPullSiYuanInboxCommand } from "../siyuan/pull-siyuan-inbox.command.js";
import { runBuildMorningTopicCommand } from "../synthesis/build-morning-topic.command.js";
import { runKnowledgeCommand } from "../editorial/knowledge.command.js";
import { runEveningCommand } from "../editorial/evening.command.js";

export type TaskId =
  | "pull_markdown_sources"
  | "pull_siyuan_inbox"
  | "status_overview"
  | "process_inbox"
  | "build_morning_topic"
  | "nightly_summary"
  | "build_knowledge_note"
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
  build_morning_topic: {
    id: "build_morning_topic",
    description: "Generate one high-quality morning brief from recent local materials",
    defaultSchedule: "daily morning",
    dependsOn: ["process_inbox"],
    costClass: "medium",
    run: async () => runBuildMorningTopicCommand()
  },
  nightly_summary: {
    id: "nightly_summary",
    description: "Generate one high-quality evening review from recent local materials",
    defaultSchedule: "daily evening",
    dependsOn: ["process_inbox"],
    costClass: "medium",
    run: async () => runNightlySummaryCommand()
  },
  build_knowledge_note: {
    id: "build_knowledge_note",
    description: "Generate one durable knowledge note from the strongest current theme",
    defaultSchedule: "manual / when a theme becomes stable",
    dependsOn: ["process_inbox"],
    costClass: "medium",
    run: () => runKnowledgeCommand({ theme: "知识沉淀" })
  },
  daily_pipeline: {
    id: "daily_pipeline",
    description: "Run the full local pipeline: process, editorial outputs, and SiYuan export",
    defaultSchedule: "daily / manual rerun",
    dependsOn: ["process_inbox", "build_morning_topic", "nightly_summary", "build_knowledge_note"],
    costClass: "medium",
    run: async () => runPipelineCommand()
  },
  export_siyuan: {
    id: "export_siyuan",
    description: "Export editorial outputs into the incremental SiYuan output root",
    defaultSchedule: "after editorial outputs",
    dependsOn: ["build_morning_topic", "nightly_summary", "build_knowledge_note"],
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
