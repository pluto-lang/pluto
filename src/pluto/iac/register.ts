import { IRegistry } from "@pluto/pluto";
import { SNSDef } from "./aws/SNSDef";
import { DynamoDBDef } from "./aws/DynamoDBDef";
import { ApiGatewayDef } from "./aws/ApiGatewayDef";
import { LambdaDef } from "./aws/LambdaDef";
import { ServiceDef } from "./k8s/ServiceDef";
import { RedisStateDef } from "./k8s/RedisStateDef";
import { RedisQueueDef } from "./k8s/RedisQueueDef";
import { IngressDef } from "./k8s/IngressDef";

export function register(reg: IRegistry) {
    reg.register('aws', 'Queue', SNSDef);
    reg.register('aws', 'State', DynamoDBDef);
    reg.register('aws', 'Router', ApiGatewayDef);
    reg.register('aws', 'Lambda', LambdaDef);

    reg.register('k8s', 'Queue', RedisQueueDef);
    reg.register('k8s', 'State', RedisStateDef);
    reg.register('k8s', 'Router', IngressDef);
    reg.register('k8s', 'Lambda', ServiceDef);
}