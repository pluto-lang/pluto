import { Registry, engine, runtime } from "@pluto/base";
import { KVStore, Lambda, Queue, Router } from "@pluto/pluto";
import * as aws from "./aws";

export function register(reg: Registry) {
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Router, aws.ApiGatewayRouter);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, KVStore, aws.DynamoKVStore);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Queue, aws.SNSQueue);
  reg.register(runtime.Type.AWS, engine.Type.pulumi, Lambda, aws.Lambda);
}
