import { load } from "js-yaml";
import { Stack } from "./stack";

export class Project {
  public readonly stacks: Stack[] = [];
  /** The name of the current specified stack. */
  public current?: string;

  constructor(
    /**
     * The project name from package.json.
     * WARNING: The resource ID is associated with the name, so if the user makes any changes,
     * they will lose control over the previous deployment.
     * */
    public readonly name: string,
    /** The root directory of this project, which need to be automatically obtained during execution. */
    public readonly rootpath: string
  ) {}

  public addStack(stack: Stack) {
    if (this.getStack(stack.name)) {
      throw new Error("There's already a stack with the same name.");
    }

    this.stacks.push(stack);
    if (this.current == undefined) {
      this.current = stack.name;
    }
  }

  public getStack(stackName: string): Stack | undefined {
    const stack = this.stacks.find((stack) => stack.name === stackName);
    if (this.current == undefined) {
      this.current = stack?.name;
    }
    return stack;
  }

  public delStack(stackName: string) {
    const idx = this.stacks.findIndex((stack) => stack.name === stackName);
    if (idx === -1) {
      return;
    }

    const stack = this.stacks.splice(idx, 1)[0];
    if (this.current == stack.name) {
      this.current = undefined;
    }
  }

  public countStack(): number {
    return this.stacks.length;
  }

  public deepCopy(): Project {
    const clonedProject = new Project(this.name, this.rootpath);
    this.stacks.forEach((stack) => clonedProject.addStack(stack.deepCopy()));
    clonedProject.current = this.current;
    return clonedProject;
  }

  public static loadFromYaml(name: string, rootpath: string, yaml: string): Project {
    const obj = load(yaml) as Project;
    const project = new Project(name, rootpath);
    Object.assign(project, obj);
    project.stacks.forEach((stack) => Object.setPrototypeOf(stack, Stack.prototype));
    return project;
  }
}
