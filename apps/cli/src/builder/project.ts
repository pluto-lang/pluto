import { input } from "@inquirer/prompts";
import { engine, runtime } from "@pluto/base";
import * as model from "../model";
import { createStack } from "./stack";

export interface CreateProjectArgs {
  name?: string;
  stack?: string;
  rtType?: runtime.Type;
  engType?: engine.Type;
}

export async function createProject(args: CreateProjectArgs): Promise<model.Project> {
  args.name =
    args.name ??
    (await input({
      message: "Project name",
      default: "hello-pluto",
    }));

  const sta = await createStack({ name: args.stack, rtType: args.rtType, engType: args.engType });

  const proj = new model.Project(args.name);
  proj.addStack(sta);
  proj.current = sta.name;
  return proj;
}
