import { iac } from "@pluto";

const state = new iac.aws.DynamoDBDef("statestore");
const router = new iac.aws.ApiGatewayDef("default");

const fn1 = new iac.aws.LambdaDef("anonymous-handler-1");
fn1.grantPermission("set", state.fuzzyArn());
router.addHandler("get", fn1, { path: "/hello" });

const fn2 = new iac.aws.LambdaDef("anonymous-handler-2");
fn2.grantPermission("get", state.fuzzyArn());
router.addHandler("get", fn2, { path: "/store" });

router.postProcess()
export const { url } = router