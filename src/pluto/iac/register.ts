import { IRegistry } from "@pluto/pluto";
import { SNSDef } from "./aws/SNSDef";
import { DynamoDBDef } from "./aws/DynamoDBDef";
import { ApiGatewayDef } from "./aws/ApiGatewayDef";
import { LambdaDef } from "./aws/LambdaDef";

export function register(reg: IRegistry) {
    reg.register('aws', 'Queue', SNSDef);
    reg.register('aws', 'State', DynamoDBDef);
    reg.register('aws', 'Router', ApiGatewayDef);
    reg.register('aws', 'Lambda', LambdaDef);
}