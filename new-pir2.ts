import { iac, IRegistry, Registry, register as plutoRegister } from "@pluto";

const RUNTIME_TYPE = process.env['RUNTIME_TYPE'] || "aws"

const reg: IRegistry = new Registry();
plutoRegister(reg);

let resDefCls = null;

resDefCls = reg.getResourceDef(RUNTIME_TYPE, 'State');
const state = new resDefCls("statestore");

resDefCls = reg.getResourceDef(RUNTIME_TYPE, 'Queue');
const queue = new resDefCls("access");

resDefCls = reg.getResourceDef(RUNTIME_TYPE, 'Router');
const router = new iac.aws.ApiGatewayDef("hello");

resDefCls = reg.getResourceDef(RUNTIME_TYPE, 'Lambda');
const fn1 = new resDefCls("anonymous-handler-1");
fn1.grantPermission("set", state.fuzzyArn());
fn1.grantPermission("get", state.fuzzyArn());
fn1.grantPermission("push", queue.fuzzyArn());
router.addHandler("get", fn1, { path: "/hello" })

resDefCls = reg.getResourceDef(RUNTIME_TYPE, 'Lambda');
const fn2 = new resDefCls("anonymous-handler-2");
fn2.grantPermission("set", state.fuzzyArn());
fn2.grantPermission("get", state.fuzzyArn());
fn2.grantPermission("push", queue.fuzzyArn());
router.addHandler("get", fn2, { path: "/store" })

router.get("/path", fn2);

resDefCls = reg.getResourceDef(RUNTIME_TYPE, 'Lambda');
const fn3 = new resDefCls("anonymous-handler-3");
fn3.grantPermission("set", state.fuzzyArn());
fn3.grantPermission("get", state.fuzzyArn());
fn3.grantPermission("push", queue.fuzzyArn());
queue.addHandler("subscribe", fn3, {})

queue.subscribe(fn3);

queue.postProcess()
router.postProcess()
export const { url } = router
