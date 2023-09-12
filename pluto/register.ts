import { iac } from "@pluto";
import { IRegistry } from "./registry";

export function register(reg: IRegistry) {
    reg.register('aws', 'Queue', iac.aws.SNSDef);
    reg.register('aws', 'State', iac.aws.DynamoDBDef);
    reg.register('aws', 'Router', iac.aws.ApiGatewayDef);
    reg.register('aws', 'Lmbda', iac.aws.LambdaDef);
}