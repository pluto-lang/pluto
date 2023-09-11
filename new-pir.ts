import { iac, Runtime } from "@pluto";

const runtime = Runtime.get('aws');

const state = runtime.newState("statestore");
const router = runtime.newRouter("default");

const fn1 = runtime.newFunction("anonymous-handler-1");
fn1.grantPermission("set", state.fuzzyArn());
router.addHandler("get", fn1, { path: "/hello" });

const fn2 = runtime.newFunction("anonymous-handler-2");
fn2.grantPermission("get", state.fuzzyArn());
router.addHandler("get", fn2, { path: "/store" });

router.postProcess()
export const { url } = router