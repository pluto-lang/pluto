import { input, select } from "@inquirer/prompts";
import { LanguageType, PlatformType, ProvisionType, config } from "@plutolang/base";
import { createStack } from "./stack";
import { resolve } from "path";

export interface CreateProjectArgs {
  name?: string;
  stack?: string;
  language?: LanguageType;
  platformType?: PlatformType;
  provisionType?: ProvisionType;
  rootpath?: string;
}

export async function createProject(args: CreateProjectArgs): Promise<config.Project> {
  args.language =
    args.language ??
    (await select({
      message: "Select a programming language",
      choices: [
        {
          name: "TypeScript",
          value: LanguageType.TypeScript,
        },
        {
          name: "Python",
          value: LanguageType.Python,
        },
      ],
    }));

  args.name =
    args.name ??
    (await input({
      message: "Project name",
      default: "hello-pluto",
    }));

  const sta = await createStack({
    name: args.stack,
    platformType: args.platformType,
    provisionType: args.provisionType,
  });

  const projectRoot = resolve(args.rootpath ?? `./${args.name}`);
  const proj = new config.Project(args.name, projectRoot, args.language);
  proj.addStack(sta);
  proj.current = sta.name;
  return proj;
}
