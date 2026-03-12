import { TaskId } from "./task-registry.js";

export type ScheduleId = "hourly_pull_markdown_sources" | "hourly_process_inbox" | "daily_pipeline_evening";

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
}

const SCHEDULES: Record<ScheduleId, TaskScheduleDefinition> = {
  hourly_pull_markdown_sources: {
    id: "hourly_pull_markdown_sources",
    taskId: "pull_markdown_sources",
    name: "LouisClaw · pull markdown sources hourly",
    description: "定时读取配置的 markdown 文件，把新增内容静默写入 landing。",
    trigger: {
      kind: "cron",
      value: "0 * * * *",
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
      value: "5 * * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 300000
  },
  daily_pipeline_evening: {
    id: "daily_pipeline_evening",
    taskId: "daily_pipeline",
    name: "LouisClaw · daily pipeline evening",
    description: "每日晚间执行完整流水线，生成 digest 与导出结果。",
    trigger: {
      kind: "cron",
      value: "10 21 * * *",
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
