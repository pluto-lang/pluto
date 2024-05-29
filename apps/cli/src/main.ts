import { Option, Command } from "commander";
import * as cmd from "./commands";
import { checkUpdate, version } from "./utils";
import logger from "./log";

function exitGracefully(sig: string) {
  if (process.env.DEBUG) {
    console.warn(`\nReceived ${sig}. Exiting...`);
  }
  console.log("\nBye~ 👋");
  process.exit(1);
}

process.on("SIGINT", () => exitGracefully("SIGINT"));
process.on("SIGTERM", () => exitGracefully("SIGTERM"));

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
      new Option("-l, --language <language>", "Programming language the project uses").choices([
        "python",
        "typescript",
      ])
    )
    .addOption(
      new Option("-p, --platform <platform>", "Target platform").choices(["AWS", "K8s", "AliCloud"])
    )
    .option("-e, --provision <provisioning engine>", "provisioning engine")
    .action(cmd.create);

  program
    .command("init")
    .description("Initialize a Pluto project in the current directory")
    .option("-n, --name <name>", "Project name")
    .option("-s, --stack <stack>", "Stack name")
    .addOption(
      new Option("-l, --language <language>", "Programming language the project uses").choices([
        "python",
        "typescript",
      ])
    )
    .addOption(
      new Option("-p, --platform <platform>", "Target platform").choices(["AWS", "K8s", "AliCloud"])
    )
    .option("-e, --provision <provisioning engine>", "provisioning engine")
    .action(cmd.init);

  program
    .command("test")
    .description(
      "Execute tests in the simulator environment or on the platform specified in the stack"
    )
    .argument("[entrypoint]", "The files need to be compiled.")
    .option("-s, --stack <stack>", "Specified stack")
    .option("--sim", "Run tests in the simulator environment.", false)
    .addOption(
      new Option(
        "-d, --deducer <deducer>",
        "Specify a deducer by setting the package name. Make sure that the package is already installed."
      ).hideHelp()
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
    .argument("[entrypoint]", "The files need to be compiled.")
    .option("-s, --stack <stack>", "Specified stack")
    .option("-y, --yes", "Automatically approve and perform the deployment", false)
    .option("-f, --force", "Force the deployment", false)
    .addOption(
      new Option(
        "-d, --deducer <deducer>",
        "Specify a deducer by setting the package name. Make sure that the package is already installed."
      ).hideHelp()
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
    .option("-f, --force", "Force the destruction", false)
    .option(
      "--clean",
      "Used to clean up resources when there has been no successful deployment.",
      false
    )
    .action(cmd.destroy);

  program
    .command("logs")
    .description(
      "View the logs of the application. Please be aware that the logs that are displayed may not be in sequence. "
    )
    .option("-s, --stack <stack>", "Specified stack")
    .option("-f, --follow", "Follow the log, like `tail -f`", false)
    .option("-a, --all", "Show all logs from the beginning", false)
    .option("--show-platform", "Show the logs of the platform", false)
    .action(cmd.log);

  program.command("stack", "Manage stacks");

  if (process.env["DEBUG"]) {
    program
      .command("compile")
      .description("Compile the source code to IR")
      .argument("[entrypoint]", "The files need to be compiled.")
      .addOption(
        new Option(
          "-d, --deducer <deducer>",
          "Specify a deducer by setting the package name. Make sure that the package is already installed."
        ).hideHelp()
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
