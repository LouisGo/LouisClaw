import { runDigestCommand } from "../digest/digest.command.js";
import { runPullMarkdownSourcesCommand } from "../intake/pull-markdown.command.js";
import { runProcessCommand } from "../process/process.command.js";
import { runStatusCommand } from "../pipeline/status.command.js";
import { runPipelineCommand } from "../pipeline/run.command.js";
import { runExportSiYuanCommand } from "../siyuan/export-siyuan.command.js";

export type TaskId =
  | "pull_markdown_sources"
  | "status_overview"
  | "process_inbox"
  | "build_digest"
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
    dependsOn: ["pull_markdown_sources"],
    costClass: "low",
    run: async () => runProcessCommand()
  },
  build_digest: {
    id: "build_digest",
    description: "Generate digest and export digest attachments from processed items",
    defaultSchedule: "daily",
    dependsOn: ["process_inbox"],
    costClass: "medium",
    run: () => runDigestCommand()
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
