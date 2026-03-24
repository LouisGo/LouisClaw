import { loadConfig } from "../../app/config.js";
import { ItemRepository } from "../../infra/storage/item-repository.js";
import { StateRepository, TaskRunStateEntry } from "../../infra/storage/state-repository.js";
import { LandingFileService } from "../intake/landing-file.service.js";
import { dateStamp, formatLocalDateTime, isSameLocalDate, timezoneLabel } from "../../shared/time.js";
import { listFiles } from "../../shared/fs.js";
import { listTaskSchedules } from "../tasks/task-schedule-registry.js";
import { OpenClawCronService } from "../tasks/openclaw-cron.service.js";

export function runStatusCommand(): void {
  const config = loadConfig();
  const itemRepository = new ItemRepository(config);
  const stateRepository = new StateRepository(config);
  const landingFileService = new LandingFileService(config);
  const today = dateStamp();
  const items = itemRepository.loadAll().filter((item) => isSameLocalDate(item.capture_time, today));
  const landingOverview = landingFileService.overview();
  const taskRunState = stateRepository.loadTaskRunState();
  const latestMorning = latestOutput(config.paths.editorialMorning);
  const latestEvening = latestOutput(config.paths.editorialEvening);
  const latestKnowledge = latestOutput(config.paths.editorialKnowledge);

  const counts = {
    total: items.length,
    drop: items.filter((item) => item.decision === "drop").length,
    archive: items.filter((item) => item.decision === "archive").length,
    digest: items.filter((item) => item.decision === "digest").length,
    follow_up: items.filter((item) => item.decision === "follow_up").length
  };

  console.log(`Date: ${today} (${timezoneLabel()})`);
  console.log(`Items total: ${counts.total}`);
  console.log(`Drop: ${counts.drop}`);
  console.log(`Archive: ${counts.archive}`);
  console.log(`Digest: ${counts.digest}`);
  console.log(`Follow up: ${counts.follow_up}`);
  console.log(`Landing total: ${landingOverview.total}`);
  console.log(`Landing supported: ${landingOverview.supported}`);
  console.log(`Landing ignored: ${landingOverview.ignored}`);
  console.log(`Latest morning: ${latestMorning || "none"}`);
  console.log(`Latest evening: ${latestEvening || "none"}`);
  console.log(`Latest knowledge: ${latestKnowledge || "none"}`);

  console.log("Recent task runs:");
  ["pull_markdown_sources", "pull_siyuan_inbox", "process_inbox", "build_morning_topic", "nightly_summary", "build_knowledge_note", "daily_pipeline"].forEach((taskId) => {
    console.log(`- ${taskId}: ${formatTaskRun(taskRunState[taskId])}`);
  });

  console.log("Schedule status:");
  try {
    const jobs = new OpenClawCronService().listJobs();
    listTaskSchedules().forEach((schedule) => {
      const installed = jobs.find((job) => job.name === schedule.name);
      console.log(`- ${schedule.id}: ${formatScheduleStatus(installed?.enabled, installed?.id)}`);
    });
  } catch (error) {
    console.log(`- unavailable: ${formatError(error)}`);
  }
}

function formatTaskRun(entry: TaskRunStateEntry | undefined): string {
  if (!entry) {
    return "never run";
  }

  const finishedAt = entry.finishedAt || entry.startedAt;
  const duration = typeof entry.durationMs === "number" ? ` duration=${formatDuration(entry.durationMs)}` : "";
  const reason = entry.error ? ` error=${entry.error}` : "";

  return `${entry.status} at ${formatLocalDateTime(finishedAt)}${duration}${reason}`;
}

function formatScheduleStatus(enabled: boolean | undefined, jobId: string | undefined): string {
  if (!jobId) {
    return "not installed";
  }

  return `${enabled ? "enabled" : "disabled"} job=${jobId}`;
}

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = Math.round(durationMs / 100) / 10;
  return `${seconds}s`;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/\s+/g, " ").trim();
  }

  return String(error);
}

function latestOutput(dirPath: string): string | undefined {
  const files = listFiles(dirPath, ".md");
  return files[files.length - 1];
}
