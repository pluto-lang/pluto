import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { IResourceInfra } from "@plutolang/base";
import { genResourceId } from "@plutolang/base/utils";
import { ComputeClosure, isComputeClosure } from "@plutolang/base/closure";
import { IScheduleInfra, Schedule, ScheduleHandler, ScheduleOptions } from "@plutolang/pluto";
import { genK8sResourceName } from "@plutolang/pluto/dist/clients/k8s";
import { KnativeService } from "./function.service";

export class PingSchedule
  extends pulumi.ComponentResource
  implements IResourceInfra, IScheduleInfra
{
  public readonly id: string;

  constructor(name: string, args?: ScheduleOptions, opts?: pulumi.CustomResourceOptions) {
    super("pluto:schedule:k8s/Ping", name, args, opts);
    this.id = genResourceId(Schedule.fqn, name);
  }

  public async cron(cron: string, closure: ComputeClosure<ScheduleHandler>): Promise<void> {
    if (!isComputeClosure(closure)) {
      throw new Error("This closure is invalid.");
    }

    const func = new KnativeService(closure, {
      name: `${this.id}-${cron.replaceAll(/[^_0-9a-zA-Z]/g, "")}-func`,
    });

    new k8s.apiextensions.CustomResource(
      genK8sResourceName(this.id, "source"),
      {
        apiVersion: "sources.knative.dev/v1",
        kind: "PingSource",
        metadata: {
          name: genK8sResourceName(this.id, "source"),
        },
        spec: {
          schedule: cron,
          data: "",
          sink: {
            ref: {
              apiVersion: "serving.knative.dev/v1",
              kind: "Service",
              name: func.kserviceMeta.name,
            },
          },
        },
      },
      { parent: this }
    );
  }

  public grantPermission(op: string, resource?: IResourceInfra) {
    op;
    resource;
  }

  public postProcess(): void {}
}
