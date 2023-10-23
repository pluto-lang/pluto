import { input } from "@inquirer/prompts";
import { engine, runtime, project } from "@plutolang/base";
import { createStack } from "./stack";

export interface CreateProjectArgs {
  name?: string;
  stack?: string;
  rtType?: runtime.Type;
  engType?: engine.Type;
}

export async function createProject(args: CreateProjectArgs): Promise<project.Project> {
  args.name =
    args.name ??
    (await input({
      message: "Project name",
      default: "hello-pluto",
    }));

  const sta = await createStack({ name: args.stack, rtType: args.rtType, engType: args.engType });

  const proj = new project.Project(args.name);
  proj.addStack(sta);
  proj.current = sta.name;
  return proj;
}
