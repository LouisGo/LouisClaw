import { execFileSync } from "node:child_process";
import { loadConfig } from "../../app/config.js";
import { TaskScheduleDefinition, ScheduleTrigger } from "./task-schedule-registry.js";

interface OpenClawCronJob {
  id: string;
  name?: string;
  enabled?: boolean;
}

interface OpenClawCronListResponse {
  jobs: OpenClawCronJob[];
}

export interface ScheduleInstallOptions {
  every?: string;
  cron?: string;
  tz?: string;
  enable?: boolean;
  disabled?: boolean;
}

export interface ScheduleInstallResult {
  action: "created" | "updated";
  jobId?: string;
  schedule: TaskScheduleDefinition;
  trigger: ScheduleTrigger;
}

export class OpenClawCronService {
  listJobs(): OpenClawCronJob[] {
    const result = execFileSync("openclaw", ["--no-color", "cron", "list", "--all", "--json"], {
      encoding: "utf8"
    });

    const parsed = parseJsonFromCliOutput(result) as OpenClawCronListResponse;
    return parsed.jobs || [];
  }

  findJobByName(name: string): OpenClawCronJob | undefined {
    return this.listJobs().find((job) => job.name === name);
  }

  installSchedule(schedule: TaskScheduleDefinition, options: ScheduleInstallOptions = {}): ScheduleInstallResult {
    const trigger = this.resolveTrigger(schedule, options);
    const existing = this.findJobByName(schedule.name);

    if (existing) {
      this.runCronEdit(existing.id, schedule, trigger, options);
      return {
        action: "updated",
        jobId: existing.id,
        schedule,
        trigger
      };
    }

    this.runCronAdd(schedule, trigger, options);

    const created = this.findJobByName(schedule.name);
    return {
      action: "created",
      jobId: created?.id,
      schedule,
      trigger
    };
  }

  private resolveTrigger(schedule: TaskScheduleDefinition, options: ScheduleInstallOptions): ScheduleTrigger {
    if (options.every && options.cron) {
      throw new Error("不能同时提供 --every 和 --cron");
    }

    if (options.every) {
      return {
        kind: "every",
        value: options.every
      };
    }

    if (options.cron) {
      return {
        kind: "cron",
        value: options.cron,
        tz: options.tz || this.defaultTimezone(schedule.trigger)
      };
    }

    if (schedule.trigger.kind === "cron") {
      return {
        kind: "cron",
        value: schedule.trigger.value,
        tz: options.tz || schedule.trigger.tz
      };
    }

    return schedule.trigger;
  }

  private defaultTimezone(trigger: ScheduleTrigger): string {
    return trigger.kind === "cron" ? trigger.tz : "Asia/Shanghai";
  }

  private runCronAdd(schedule: TaskScheduleDefinition, trigger: ScheduleTrigger, options: ScheduleInstallOptions): void {
    execFileSync("openclaw", ["cron", "add", ...this.buildCronArgs(schedule, trigger, options, false)], {
      encoding: "utf8"
    });
  }

  private runCronEdit(jobId: string, schedule: TaskScheduleDefinition, trigger: ScheduleTrigger, options: ScheduleInstallOptions): void {
    execFileSync("openclaw", ["cron", "edit", jobId, ...this.buildCronArgs(schedule, trigger, options, true)], {
      encoding: "utf8"
    });
  }

  private buildCronArgs(
    schedule: TaskScheduleDefinition,
    trigger: ScheduleTrigger,
    options: ScheduleInstallOptions,
    allowEnableFlag: boolean
  ): string[] {
    const config = loadConfig();
    const args = [
      "--name",
      schedule.name,
      "--description",
      schedule.description,
      "--agent",
      "main",
      "--session",
      "isolated",
      "--light-context",
      "--thinking",
      "minimal",
      "--message",
      this.buildTaskMessage(schedule.taskId),
      "--timeout",
      String(schedule.timeoutMs)
    ];

    if (!schedule.deliverResult) {
      args.push("--no-deliver");
    } else {
      args.push("--expect-final");
      if (config.openclawContext.feishuPushTarget) {
        args.push("--channel", "feishu", "--to", config.openclawContext.feishuPushTarget);
      }
    }

    if (trigger.kind === "every") {
      args.push("--every", trigger.value);
    } else {
      args.push("--cron", trigger.value, "--tz", trigger.tz);
    }

    if (options.enable && options.disabled) {
      throw new Error("不能同时提供 --enable 和 --disabled");
    }

    if (allowEnableFlag && options.enable) {
      args.push("--enable");
    }

    if (options.disabled) {
      args.push("--disabled");
    }

    return args;
  }

  private buildTaskMessage(taskId: string): string {
    const config = loadConfig();

    if (taskId === "build_morning_topic") {
      return `请在当前工作区直接运行 \`npm run task -- run build_morning_topic\`。不要做额外改动。只允许使用本地沉淀材料，不要扩展搜索。完成后用简洁中文总结：标题、主题、可阅读路径。`;
    }

    if (taskId === "nightly_summary") {
      return "请在当前工作区直接运行 `npm run task -- run nightly_summary`。不要做额外改动。完成后用简洁中文总结：标题、主题、可阅读路径。";
    }

    if (taskId === "build_knowledge_note") {
      return "请在当前工作区直接运行 `npm run task -- run build_knowledge_note`。不要做额外改动。只允许使用本地沉淀材料，不要做开放式搜索。完成后用简洁中文总结：标题、主题、可阅读路径。";
    }

    return `请在当前工作区直接运行 \`npm run task -- run ${taskId}\`。不要做额外改动，只执行这个标准任务，并用简洁中文总结结果。`;
  }
}

function parseJsonFromCliOutput(value: string): unknown {
  const normalized = value.replace(/\u001b\[[0-9;]*m/g, "");
  const jsonStart = normalized.indexOf("{");
  if (jsonStart === -1) {
    throw new Error("OpenClaw cron list did not return JSON output");
  }

  return JSON.parse(normalized.slice(jsonStart));
}
