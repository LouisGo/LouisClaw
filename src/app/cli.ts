import { Command } from "commander";
import { runAddCommand } from "../modules/intake/add.command.js";
import { runProcessCommand } from "../modules/process/process.command.js";
import { runWatchCommand } from "../modules/watch/watch.command.js";
import { runDigestCommand } from "../modules/digest/digest.command.js";
import { runExportSiYuanCommand } from "../modules/siyuan/export-siyuan.command.js";
import { runPipelineCommand } from "../modules/pipeline/run.command.js";
import { runStatusCommand } from "../modules/pipeline/status.command.js";
import { runTaskListCommand, runTaskRunCommand } from "../modules/tasks/task.command.js";
import { runScheduleInstallCommand, runScheduleListCommand } from "../modules/tasks/task-schedule.command.js";

const program = new Command();

program.name("ai-flow").description("Personal information workflow CLI");

program
  .command("add")
  .requiredOption("--type <type>")
  .option("--content <content>")
  .option("--file <path>")
  .option("--source <source>")
  .option("--device <device>")
  .option("--url <url>")
  .option("--title <title>")
  .action(runAddCommand);

program.command("process").action(async () => runProcessCommand());
program.command("watch").action(runWatchCommand);
program.command("digest").action(runDigestCommand);
program.command("run").action(async () => runPipelineCommand());
program.command("status").action(runStatusCommand);
program.command("export-siyuan").action(runExportSiYuanCommand);

const taskProgram = program.command("task").description("Run standardized LouisClaw tasks");

taskProgram.command("list").action(runTaskListCommand);
taskProgram.command("run").argument("<taskId>").action(async (taskId: string) => runTaskRunCommand(taskId));

const scheduleProgram = program.command("schedule").description("Manage standardized LouisClaw schedules");

scheduleProgram.command("list").action(runScheduleListCommand);
scheduleProgram
  .command("install")
  .argument("<scheduleId>")
  .option("--every <duration>")
  .option("--cron <expr>")
  .option("--tz <iana>")
  .option("--enable")
  .option("--disabled")
  .action((scheduleId: string, options) => runScheduleInstallCommand(scheduleId, options));

await program.parseAsync();
