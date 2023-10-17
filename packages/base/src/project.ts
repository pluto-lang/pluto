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
    for (let sta of this.stacks) {
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
  region: string;
  accessKeyId: string;
  secretAccessKey: string;

  constructor(region: string, ak: string, sk: string) {
    super(runtime.Type.AWS);
    this.region = region;
    this.accessKeyId = ak;
    this.secretAccessKey = sk;
  }
}

export class K8sRuntime extends Runtime {
  kubeConfigPath: string;

  constructor(kubeConfigPath: string) {
    super(runtime.Type.K8s);
    this.kubeConfigPath = kubeConfigPath;
  }
}
