import { OpenClawCronService, ScheduleInstallOptions } from "./openclaw-cron.service.js";
import { assertTaskSchedule, listTaskSchedules } from "./task-schedule-registry.js";

export interface ScheduleInstallCommandOptions extends ScheduleInstallOptions {}

export function runScheduleListCommand(): void {
  const cronService = new OpenClawCronService();
  const jobs = cronService.listJobs();

  listTaskSchedules().forEach((schedule) => {
    const installed = jobs.find((job) => job.name === schedule.name);
    console.log(`${schedule.id}`);
    console.log(`  task id: ${schedule.taskId}`);
    console.log(`  description: ${schedule.description}`);
    console.log(`  default trigger: ${formatTrigger(schedule.trigger)}`);
    console.log(`  installed: ${installed ? `yes (${installed.id})` : "no"}`);
    if (installed) {
      console.log(`  enabled: ${installed.enabled ? "yes" : "no"}`);
    }
  });
}

export function runScheduleInstallCommand(scheduleId: string, options: ScheduleInstallCommandOptions): void {
  const schedule = assertTaskSchedule(scheduleId);
  const cronService = new OpenClawCronService();
  const result = cronService.installSchedule(schedule, options);

  console.log(`${result.action === "created" ? "Created" : "Updated"} schedule: ${schedule.id}`);
  if (result.jobId) {
    console.log(`Job id: ${result.jobId}`);
  }
  console.log(`Task id: ${schedule.taskId}`);
  console.log(`Trigger: ${formatTrigger(result.trigger)}`);
}

function formatTrigger(trigger: { kind: "every"; value: string } | { kind: "cron"; value: string; tz: string }): string {
  return trigger.kind === "every"
    ? `every ${trigger.value}`
    : `cron ${trigger.value} tz=${trigger.tz}`;
}
