import { Command } from "commander";
import { newStack } from "./commands";
import { version } from "./utils";

async function main() {
  const program = new Command();

  program.name("pluto stack").version(version);

  program.command("new").action(newStack);

  await program.parseAsync(process.argv);
}

main();
