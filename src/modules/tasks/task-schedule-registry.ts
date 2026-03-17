import { TaskId } from "./task-registry.js";

export type ScheduleId =
  | "hourly_pull_markdown_sources"
  | "hourly_pull_siyuan_inbox"
  | "hourly_process_inbox"
  | "morning_daily_ai_news_request"
  | "morning_daily_ai_news_collect"
  | "morning_daily_ai_news_enrich"
  | "morning_external_research_request"
  | "morning_external_research_collect"
  | "morning_topic_push"
  | "nightly_summary_push";

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
  morning_daily_ai_news_request: {
    id: "morning_daily_ai_news_request",
    taskId: "prepare_daily_ai_news",
    name: "LouisClaw · morning daily AI news request",
    description: "每天晨间生成一份受限 AI 新闻抓取请求，只允许白名单可信来源。",
    trigger: {
      kind: "cron",
      value: "8 7 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 300000,
    installedByDefault: false
  },
  morning_daily_ai_news_collect: {
    id: "morning_daily_ai_news_collect",
    taskId: "collect_daily_ai_news",
    name: "LouisClaw · morning daily AI news collect",
    description: "根据固定高质量 RSS / 白名单新闻页收集每日 AI 高质量信号，默认不安装。",
    trigger: {
      kind: "cron",
      value: "18 7 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 900000,
    installedByDefault: false
  },
  morning_daily_ai_news_enrich: {
    id: "morning_daily_ai_news_enrich",
    taskId: "enrich_daily_ai_news",
    name: "LouisClaw · morning daily AI news enrich",
    description: "在确定性采集完成后，由 LLM 只补英文标题的中文翻译等轻量 enrich，默认不安装。",
    trigger: {
      kind: "cron",
      value: "26 7 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 900000,
    installedByDefault: false
  },
  morning_external_research_request: {
    id: "morning_external_research_request",
    taskId: "prepare_external_research",
    name: "LouisClaw · morning external research request",
    description: "每天晨间先判断本地材料是否不足；不足时才生成一份受限的外部资料补充请求。",
    trigger: {
      kind: "cron",
      value: "12 7 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 300000,
    installedByDefault: false
  },
  morning_external_research_collect: {
    id: "morning_external_research_collect",
    taskId: "collect_external_research",
    name: "LouisClaw · morning external research collect",
    description: "仅在存在 research request 时，由 OpenClaw 受限联网补充资料；默认不安装，避免额外 token 消耗。",
    trigger: {
      kind: "cron",
      value: "20 7 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 900000,
    installedByDefault: false
  },
  morning_topic_push: {
    id: "morning_topic_push",
    taskId: "build_morning_topic",
    name: "LouisClaw · morning topic push",
    description: "每天 08:00 生成一篇 30-60 分钟可读的晨间专题，并主动推送结果。",
    trigger: {
      kind: "cron",
      value: "0 8 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 600000,
    deliverResult: true
  },
  nightly_summary_push: {
    id: "nightly_summary_push",
    taskId: "nightly_summary",
    name: "LouisClaw · nightly summary push",
    description: "每天 23:00 生成当天总结，并主动推送结果。",
    trigger: {
      kind: "cron",
      value: "0 23 * * *",
      tz: "Asia/Shanghai"
    },
    timeoutMs: 600000,
    deliverResult: true
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
