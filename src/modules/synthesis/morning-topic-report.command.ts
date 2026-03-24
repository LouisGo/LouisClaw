import { loadConfig } from "../../app/config.js";
import { TaskRunStateEntry } from "../../infra/storage/state-repository.js";
import { dateStamp, isSameLocalDate } from "../../shared/time.js";
import { loadMorningTopicReportState } from "../tasks/push-report-state.js";
import { TaskRunStateService } from "../tasks/task-run-state.service.js";

export function runMorningTopicReportCommand(): void {
  const config = loadConfig();
  const today = dateStamp();
  const state = loadMorningTopicReportState(config);
  const taskRun = new TaskRunStateService().loadLatest().build_morning_topic;
  const stateReady = Boolean(state && state.localDate === today);
  const failureReason = todayFailureReason(taskRun, today) || state?.error;

  console.log(`今天的晨间专题标题：${stateReady && state?.title ? state.title : "未生成"}`);
  console.log(`材料条数：${stateReady ? state?.itemCount || 0 : 0}`);
  console.log(`AI 新闻条数：${stateReady ? state?.newsCount || 0 : 0}`);
  console.log(`可阅读位置：${stateReady && state?.filePath ? state.filePath : "未生成"}`);

  if (failureReason) {
    console.log(`补充说明：已生成推送摘要，但构建流程存在异常：${failureReason}`);
    return;
  }

  if (stateReady && state?.skippedReason) {
    console.log(`补充说明：今天未生成新专题，原因：${state.skippedReason}`);
  }
}

function todayFailureReason(entry: TaskRunStateEntry | undefined, today: string): string | undefined {
  if (!entry || entry.status !== "failed") {
    return undefined;
  }

  if (isSameLocalDate(entry.startedAt, today) || (entry.finishedAt && isSameLocalDate(entry.finishedAt, today))) {
    return entry.error;
  }

  return undefined;
}
