import { input } from "@inquirer/prompts";
import { config, engine, runtime } from "@plutolang/base";
import { createStack } from "./stack";
import { resolve } from "path";

export interface CreateProjectArgs {
  name?: string;
  stack?: string;
  rtType?: runtime.Type;
  engType?: engine.Type;
}

export async function createProject(args: CreateProjectArgs): Promise<config.Project> {
  args.name =
    args.name ??
    (await input({
      message: "Project name",
      default: "hello-pluto",
    }));

  const sta = await createStack({ name: args.stack, rtType: args.rtType, engType: args.engType });

  const projectRoot = resolve("./", args.name);
  const proj = new config.Project(args.name, projectRoot);
  proj.addStack(sta);
  proj.current = sta.name;
  return proj;
}
