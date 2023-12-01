import { Registry, engine, runtime } from "@plutolang/base";
import { KVStore, Queue, Router, Schedule, Tester } from "@plutolang/pluto";
import * as aws from "./aws";
import * as k8s from "./k8s";
import * as ali from "./alicloud";

export function register(reg: Registry) {
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Router, aws.ApiGatewayRouter);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, KVStore, aws.DynamoKVStore);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Queue, aws.SNSQueue);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Schedule, aws.CloudWatchSchedule);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, "FnResource", aws.Lambda);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Tester, aws.Tester);

  reg.register(runtime.Type.K8s, engine.Type.pulumi, Router, k8s.IngressRouter);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, KVStore, k8s.RedisKVStore);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, Queue, k8s.RedisQueue);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, Schedule, k8s.PingSchedule);
  reg.register(runtime.Type.K8s, engine.Type.pulumi, "FnResource", k8s.ServiceLambda);

  reg.register(runtime.Type.AliCloud, engine.Type.pulumi, Router, ali.AppRouter);
  reg.register(runtime.Type.AliCloud, engine.Type.pulumi, "FnResource", ali.FCFnResource);
}
