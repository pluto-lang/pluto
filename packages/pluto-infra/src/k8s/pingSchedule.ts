import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IResource, ResourceInfra } from "@plutolang/base";
import { ScheduleInfra, ScheduleInfraOptions } from "@plutolang/pluto";
import { ServiceLambda } from "./serviceLambda";

export class PingSchedule extends pulumi.ComponentResource implements ResourceInfra, ScheduleInfra {
  readonly name: string;

  constructor(name: string, args?: ScheduleInfraOptions, opts?: pulumi.CustomResourceOptions) {
    super("pluto:schedule:k8s/Ping", name, args, opts);
    this.name = name;
  }

  public async cron(cron: string, fn: IResource): Promise<void> {
    if (!(fn instanceof ServiceLambda)) {
      throw new Error("Fn is not a subclass of ServiceLambda.");
    }

    new k8s.apiextensions.CustomResource(
      `${this.name}-evt-source`,
      {
        apiVersion: "sources.knative.dev/v1",
        kind: "PingSource",
        metadata: {
          name: `${this.name}-evt-source`,
        },
        spec: {
          schedule: cron,
          data: "",
          sink: {
            ref: {
              apiVersion: "serving.knative.dev/v1",
              kind: "Service",
              name: fn.kservice.metadata.name,
            },
          },
        },
      },
      { parent: this }
    );
  }

  public getPermission(op: string, resource?: ResourceInfra) {
    op;
    resource;
  }

  public postProcess(): void {}
}
