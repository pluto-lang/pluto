import { Registry, engine, runtime } from "@plutolang/base";
import * as pluto from "@plutolang/pluto";
import * as aws from "./aws";
import * as k8s from "./k8s";
import * as ali from "./alicloud";
import * as sim from "./simulator";

export { Function } from "./function";
export { KVStore } from "./kvstore";
export { Queue } from "./queue";
export { Router } from "./router";
export { Schedule } from "./schedule";
export { Tester } from "./tester";

export function register(reg: Registry) {
  reg.register(runtime.Type.AWS, engine.Type.pulumi, pluto.Router, aws.ApiGatewayRouter);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, pluto.KVStore, aws.DynamoKVStore);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, pluto.Queue, aws.SNSQueue);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, pluto.Schedule, aws.CloudWatchSchedule);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, "FnResource", aws.Lambda);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, pluto.Tester, aws.Tester);

  reg.register(runtime.Type.K8s, engine.Type.pulumi, pluto.Router, k8s.IngressRouter);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, pluto.KVStore, k8s.RedisKVStore);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, pluto.Queue, k8s.RedisQueue);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, pluto.Schedule, k8s.PingSchedule);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, "FnResource", k8s.ServiceLambda);

  reg.register(runtime.Type.AliCloud, engine.Type.pulumi, pluto.Router, ali.AppRouter);
  reg.register(runtime.Type.AliCloud, engine.Type.pulumi, "FnResource", ali.FCFnResource);

  reg.register(runtime.Type.Simulator, engine.Type.simulator, pluto.Router, sim.SimRouter);
  reg.register(runtime.Type.Simulator, engine.Type.simulator, pluto.KVStore, sim.SimKVStore);
  reg.register(runtime.Type.Simulator, engine.Type.simulator, pluto.Queue, sim.SimQueue);
  reg.register(runtime.Type.Simulator, engine.Type.simulator, pluto.Tester, sim.SimTester);
  reg.register(runtime.Type.Simulator, engine.Type.simulator, "FnResource", sim.SimFunction);
}
