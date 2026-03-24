import { TaskId } from "./task-registry.js";

export type ScheduleId =
  | "hourly_pull_markdown_sources"
  | "hourly_pull_siyuan_inbox"
  | "hourly_process_inbox"
  | "morning_topic_build"
  | "nightly_summary_build";

export type ScheduleTrigger =
  | { kind: "every"; value: string }
  | { kind: "cron"; value: string; tz: string };

export interface TaskScheduleDefinition {
  id: ScheduleId;
  taskId: TaskId;
  name: string;
  description: string;
  trigger: ScheduleTrigger;
  timeoutMs: number;
  deliverResult?: boolean;
  installedByDefault?: boolean;
}

const SCHEDULES: Record<ScheduleId, TaskScheduleDefinition> = {
  hourly_pull_markdown_sources: {
    id: "hourly_pull_markdown_sources",
    taskId: "pull_markdown_sources",
    name: "LouisClaw · pull markdown sources hourly",
    description: "定时读取配置的 markdown 文件，把新增内容静默写入 landing。",
    trigger: {
      kind: "cron",
      value: "0 0-1,7-23 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 300000
  },
  hourly_pull_siyuan_inbox: {
    id: "hourly_pull_siyuan_inbox",
    taskId: "pull_siyuan_inbox",
    name: "LouisClaw · pull SiYuan inbox hourly",
    description: "定时读取配置的思源 iNBox 文档，把新增内容静默写入 landing。",
    trigger: {
      kind: "cron",
      value: "2 0-1,7-23 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 300000
  },
  hourly_process_inbox: {
    id: "hourly_process_inbox",
    taskId: "process_inbox",
    name: "LouisClaw · process inbox hourly",
    description: "定时执行 landing -> inbox -> process，保持静默输入被持续结构化处理。",
    trigger: {
      kind: "cron",
      value: "5 0-1,7-23 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 300000
  },
  morning_topic_build: {
    id: "morning_topic_build",
    taskId: "build_morning_topic",
    name: "LouisClaw · morning brief build",
    description: "每天 08:00 生成一篇晨间成品文稿。",
    trigger: {
      kind: "cron",
      value: "0 8 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 600000
  },
  nightly_summary_build: {
    id: "nightly_summary_build",
    taskId: "nightly_summary",
    name: "LouisClaw · evening review build",
    description: "每天 23:00 生成一篇夜间回看文稿。",
    trigger: {
      kind: "cron",
      value: "0 23 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 600000
  }
};

export function listTaskSchedules(): TaskScheduleDefinition[] {
  return Object.values(SCHEDULES);
}

export function getTaskSchedule(scheduleId: string): TaskScheduleDefinition | undefined {
  return SCHEDULES[scheduleId as ScheduleId];
}

export function assertTaskSchedule(scheduleId: string): TaskScheduleDefinition {
  const schedule = getTaskSchedule(scheduleId);

  if (!schedule) {
    const available = listTaskSchedules().map((entry) => entry.id).join(", ");
    throw new Error(`未知调度：${scheduleId}。可用调度：${available}`);
  }

  return schedule;
}
