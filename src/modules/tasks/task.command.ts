import { assertTaskDefinition, listTaskDefinitions } from "./task-registry.js";

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

  console.log(`Running task: ${task.id}`);
  console.log(`Description: ${task.description}`);
  console.log(`Default schedule: ${task.defaultSchedule}`);
  console.log(`Depends on: ${task.dependsOn.length ? task.dependsOn.join(", ") : "none"}`);
  console.log(`Cost class: ${task.costClass}`);

  await task.run();
}
