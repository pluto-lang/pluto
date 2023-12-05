import * as engine from "./engine";
import * as runtime from "./runtime";

export class Project {
  name: string;
  stacks: Stack[];
  current: string;

  constructor(name: string) {
    this.name = name;
    this.stacks = [];
    this.current = "";
  }

  public addStack(s: Stack) {
    this.stacks.push(s);
  }

  public getStack(sname: string): Stack | undefined {
    for (const sta of this.stacks) {
      if (sta.name == sname) {
        return sta;
      }
    }
    return;
  }
}

export class Stack {
  name: string;
  runtime: Runtime;
  engine: engine.Type;

  constructor(name: string, rt: Runtime, eng: engine.Type) {
    this.name = name;
    this.runtime = rt;
    this.engine = eng;
  }
}

export abstract class Runtime {
  type: runtime.Type;

  constructor(ty: runtime.Type) {
    this.type = ty;
  }
}

export class AwsRuntime extends Runtime {
  constructor() {
    super(runtime.Type.AWS);
  }
}

export class K8sRuntime extends Runtime {
  kubeConfigPath: string;

  constructor(kubeConfigPath: string) {
    super(runtime.Type.K8s);
    this.kubeConfigPath = kubeConfigPath;
  }
}

export class AlicloudRuntime extends Runtime {
  constructor() {
    super(runtime.Type.AliCloud);
  }
}

export class SimulatorRuntime extends Runtime {
  constructor() {
    super(runtime.Type.Simulator);
  }
}
