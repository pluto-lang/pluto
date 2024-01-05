import { Option, Command } from "commander";
import * as cmd from "./commands";
import { checkUpdate, version } from "./utils";
import logger from "./log";

async function main() {
  checkUpdate();

  const program = new Command();

  program.name("pluto").version(version);

  program.addOption(
    new Option("--debug", "enable debug logging").argParser(() => {
      process.env["DEBUG"] = "1";
    })
  );

  program
    .command("new")
    .description("Create a new Pluto project")
    .option("-n, --name <name>", "Project name")
    .option("-s, --stack <stack>", "Stack name")
    .addOption(
      new Option("-p, --platform <platform>", "Target platform")
        .choices(["aws", "k8s"])
        .argParser((val: string) => {
          return val.toUpperCase();
        })
    )
    .option("-e, --engine <engine>", "IaC engine")
    .action(cmd.create);

  program
    .command("test")
    .description(
      "Execute tests in the simulator environment or on the platform specified in the stack"
    )
    .argument("[entrypoint]", "The files need to be compiled.", "src/index.ts")
    .option("-s, --stack <stack>", "Specified stack")
    .option("--sim", "Run tests in the simulator environment.", false)
    .addOption(
      new Option(
        "-d, --deducer <deducer>",
        "Specify a deducer by setting the package name. Make sure that the package is already installed."
      )
        .default("@plutolang/static-deducer")
        .hideHelp()
    )
    .addOption(
      new Option("-g, --generator <generator>", "Specify a generator by setting the package name.")
        .default("@plutolang/static-generator")
        .hideHelp()
    )
    .action(cmd.test);

  program
    .command("deploy")
    .description("Deploy this project to the platform specified in the stack")
    .argument("[entrypoint]", "The files need to be compiled.", "src/index.ts")
    .option("-s, --stack <stack>", "Specified stack")
    .option("-y, --yes", "Automatically approve and perform the deployment", false)
    .addOption(
      new Option(
        "-d, --deducer <deducer>",
        "Specify a deducer by setting the package name. Make sure that the package is already installed."
      )
        .default("@plutolang/static-deducer")
        .hideHelp()
    )
    .addOption(
      new Option("-g, --generator <generator>", "Specify a generator by setting the package name.")
        .default("@plutolang/static-generator")
        .hideHelp()
    )
    .option("--apply", "No deduction or generation, only application.", false)
    .action(cmd.deploy);

  program
    .command("destroy")
    .description("Take the application offline and revoke all deployed resources")
    .option("-s, --stack <stack>", "Specified stack")
    .option(
      "--clean",
      "Used to clean up resources when there has been no successful deployment.",
      false
    )
    .action(cmd.destroy);

  program.command("stack", "Manage stacks");

  if (process.env["DEBUG"]) {
    program
      .command("compile")
      .description("Compile the source code to IR")
      .argument("[entrypoint]", "The files need to be compiled.", "src/index.ts")
      .addOption(
        new Option(
          "-d, --deducer <deducer>",
          "Specify a deducer by setting the package name. Make sure that the package is already installed."
        )
          .default("@plutolang/static-deducer")
          .hideHelp()
      )
      .addOption(
        new Option(
          "-g, --generator <generator>",
          "Specify a generator by setting the package name."
        )
          .default("@plutolang/static-generator")
          .hideHelp()
      )
      .action(cmd.compile);
  }

  program.addHelpText(
    "after",
    `
Examples:
  $ pluto deploy`
  );

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
