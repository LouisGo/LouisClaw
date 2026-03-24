import { loadConfig } from "../../app/config.js";
import { TaskRunStateEntry } from "../../infra/storage/state-repository.js";
import { TaskRunStateService } from "../tasks/task-run-state.service.js";
import { loadNightlySummaryReportState } from "../tasks/push-report-state.js";
import { dateStamp, isSameLocalDate } from "../../shared/time.js";

export function runNightlySummaryReportCommand(): void {
  const config = loadConfig();
  const today = dateStamp();
  const state = loadNightlySummaryReportState(config);
  const taskRun = new TaskRunStateService().loadLatest().nightly_summary;
  const stateReady = Boolean(state && state.localDate === today);
  const failureReason = todayFailureReason(taskRun, today) || state?.error;
  const success = Boolean(stateReady && state?.digestPath && !failureReason);

  console.log(`今日总结：${success ? "成功" : "失败"}`);
  console.log(`Digest 路径：${stateReady && state?.digestPath ? state.digestPath : "未生成"}`);
  console.log(`导出附件路径：${stateReady && state?.digestAttachmentPath ? state.digestAttachmentPath : "未生成"}`);
  console.log(`已同步到思源：${stateReady && state?.siyuanSynced ? "是" : "否"}`);
  console.log(`本次导出数量：${stateReady ? state?.itemExportCount || 0 : 0}`);
  console.log(`一句话说明：${buildSummarySentence(success, stateReady, failureReason)}`);
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

function buildSummarySentence(success: boolean, stateReady: boolean, failureReason?: string): string {
  if (success) {
    return "nightly_summary 已完成，digest、导出附件和推送摘要都已就绪。";
  }

  if (stateReady) {
    return `nightly_summary 已产出本地结果，但后续步骤失败：${failureReason || "unknown error"}`;
  }

  return `nightly_summary 今天尚未产出可推送结果：${failureReason || "result not ready"}`;
}
