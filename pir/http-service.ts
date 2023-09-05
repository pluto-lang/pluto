import { LambdaDef } from "../pluto/iac/aws/LambdaDef";
import { DynamoDBDef } from "../pluto/iac/aws/DynamoDBDef";
import { ApiGatewayDef } from "../pluto/iac/aws/ApiGatewayDef";

const state = new DynamoDBDef("statestore");
const router = new ApiGatewayDef("default");

const fn1 = new LambdaDef("anonymous-handler-1");
fn1.grantPermission("set", state.fuzzyArn());
router.addHandler("get", fn1, { path: "/hello" });

const fn2 = new LambdaDef("anonymous-handler-2");
fn2.grantPermission("get", state.fuzzyArn());
router.addHandler("get", fn2, { path: "/store" });

export const ApiEndpoint = router.apiGateway.apiEndpoint;