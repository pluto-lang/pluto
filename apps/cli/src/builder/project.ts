import { input } from "@inquirer/prompts";
import { PlatformType, ProvisionType, config } from "@plutolang/base";
import { createStack } from "./stack";
import { resolve } from "path";

export interface CreateProjectArgs {
  name?: string;
  stack?: string;
  platformType?: PlatformType;
  provisionType?: ProvisionType;
}

export async function createProject(args: CreateProjectArgs): Promise<config.Project> {
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

  const projectRoot = resolve("./", args.name);
  const proj = new config.Project(args.name, projectRoot);
  proj.addStack(sta);
  proj.current = sta.name;
  return proj;
}
