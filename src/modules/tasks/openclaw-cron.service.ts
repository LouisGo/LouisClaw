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
      "--message",
      this.buildTaskMessage(schedule.taskId),
      "--timeout",
      String(schedule.timeoutMs)
    ];

    if (!schedule.deliverResult) {
      args.push("--no-deliver");
    } else if (config.openclawContext.feishuPushTarget) {
      args.push("--channel", "feishu", "--to", config.openclawContext.feishuPushTarget);
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
      return `请在当前工作区直接运行 \`npm run task -- run build_morning_topic\`。不要做额外改动。输入边界：最多参考 ${config.openclawContext.maxItems} 条 item 摘要、${config.openclawContext.maxPackets} 个 research packet、${config.openclawContext.maxDigests} 个 digest，不要扫描整个 data 目录。完成后用简洁中文主动总结：今天的晨间专题标题、材料条数、可去哪里阅读。`;
    }

    if (taskId === "collect_external_research") {
      return `先检查 \`data/research/requests/\` 下是否存在最新的 pending research request；如果没有，就停止并简洁说明 skipped。若存在，则严格按 request 文件里的边界执行：只围绕该主题、只用高质量公开来源、最多读取 request 指定数量的来源、不做开放式延伸。不要读取超过 ${config.openclawContext.maxPackets} 个旧 research packet，也不要扫描无关 digest/item。完成后把 research packet 写入 request frontmatter 指定的 output_path，并把 request 的 frontmatter status 改成 completed。输出只需简洁说明：topic、sources used、packet path。`;
    }

    if (taskId === "prepare_external_research") {
      return "请在当前工作区直接运行 `npm run task -- run prepare_external_research`。不要做额外改动，只执行这个标准任务，并用简洁中文总结结果。";
    }

    if (taskId === "nightly_summary") {
      return "请在当前工作区直接运行 `npm run task -- run nightly_summary`。不要做额外改动。完成后严格按下面模板主动推送，不要过度缩写，也不要只发一句话：\n\n今日总结：<成功/失败>\nDigest 路径：<path>\n导出附件路径：<path>\n已同步到思源：<是/否>\n本次导出数量：<number>\n一句话说明：<今天这次总结的总体情况>\n\n如果任务失败，保留同样字段，并在一句话说明里写清失败原因。";
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
