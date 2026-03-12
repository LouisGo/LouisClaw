import { loadConfig } from "../../app/config.js";
import { StateRepository, TaskRunStateEntry, TaskRunStatus } from "../../infra/storage/state-repository.js";
import { nowIso } from "../../shared/time.js";

export class TaskRunStateService {
  private readonly repository = new StateRepository(loadConfig());

  markStarted(taskId: string): TaskRunStateEntry {
    const entry: TaskRunStateEntry = {
      taskId,
      status: "running",
      startedAt: nowIso()
    };

    this.save(entry);
    return entry;
  }

  markFinished(taskId: string, startedAt: string, status: Exclude<TaskRunStatus, "running">, error?: unknown): TaskRunStateEntry {
    const finishedAt = nowIso();
    const entry: TaskRunStateEntry = {
      taskId,
      status,
      startedAt,
      finishedAt,
      durationMs: Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt)),
      error: status === "failed" ? this.normalizeError(error) : undefined
    };

    this.save(entry);
    return entry;
  }

  loadLatest(): Record<string, TaskRunStateEntry> {
    return this.repository.loadTaskRunState();
  }

  private save(entry: TaskRunStateEntry): void {
    const state = this.repository.loadTaskRunState();
    state[entry.taskId] = entry;
    this.repository.saveTaskRunState(state);
  }

  private normalizeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message.replace(/\s+/g, " ").trim().slice(0, 240);
    }

    return String(error || "unknown error").replace(/\s+/g, " ").trim().slice(0, 240);
  }
}
