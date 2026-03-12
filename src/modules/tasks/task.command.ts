import { assertTaskDefinition, listTaskDefinitions } from "./task-registry.js";
import { TaskRunStateService } from "./task-run-state.service.js";

export function runTaskListCommand(): void {
  const tasks = listTaskDefinitions();

  tasks.forEach((task) => {
    console.log(`${task.id}`);
    console.log(`  description: ${task.description}`);
    console.log(`  default schedule: ${task.defaultSchedule}`);
    console.log(`  depends on: ${task.dependsOn.length ? task.dependsOn.join(", ") : "none"}`);
    console.log(`  cost class: ${task.costClass}`);
  });
}

export async function runTaskRunCommand(taskId: string): Promise<void> {
  const task = assertTaskDefinition(taskId);
  const taskRunStateService = new TaskRunStateService();

  console.log(`Running task: ${task.id}`);
  console.log(`Description: ${task.description}`);
  console.log(`Default schedule: ${task.defaultSchedule}`);
  console.log(`Depends on: ${task.dependsOn.length ? task.dependsOn.join(", ") : "none"}`);
  console.log(`Cost class: ${task.costClass}`);

  const started = taskRunStateService.markStarted(task.id);

  try {
    await task.run();
    taskRunStateService.markFinished(task.id, started.startedAt, "success");
  } catch (error) {
    taskRunStateService.markFinished(task.id, started.startedAt, "failed", error);
    throw error;
  }
}
