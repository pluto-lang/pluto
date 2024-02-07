---
title: 运行时函数访问基础设施代码在编译时生成的值
date: 2024-01-08
---

# 运行时函数访问基础设施代码在编译时生成的值

Pluto 程序在编译时会被拆分成多个函数，然后由[适配器](../concepts/adapter.zh-CN.md)部署到云平台上。第一种部署方式，也是最常用的部署方式就是：先由[生成器](../concepts/generator.zh-CN.md)生成一份基础设施定义代码（下称 IaC 代码），然后由适配器调用相应 IaC 引擎执行 IaC 代码。其次，第二种部署方式是：针对不支持 IaC 引擎的运行时环境（如本地模拟环境），适配器可能会采用根据参考架构直接调用运行时环境的 API，来构建基础设施环境，部署 Pluto 程序的所有函数。

Pluto 程序被部署后，所部署的函数实例会在运行时访问资源对象的一些方法或属性，来与资源实例交互。但是，资源对象属性的值可能是在执行 IaC 代码或调用运行时环境 API 后，运行时环境返回的值，如 ApiGateway 的 URL。仅凭用户在程序中提供的信息无法获取到这些属性值。因此，需要构建一个机制来使得基础设施代码在编译时生成的值能够被运行时函数访问到。

本篇文档就是设计这样一套机制来解决这个问题，首先会对解决该问题的基本思路进行介绍，然后通过理想化例子来看给用户提供的最佳界面是怎样的，最后根据功能需求给出实现思路。

## 解决思路

解决该问题的基本思路是：通过环境变量来传递编译时的生成值。前提条件是：支持在编译时阶段配置函数实例的环境变量。

具体处理过程是，针对某函数实例依赖的编译时生成值，构建一个环境变量的键值对，在编译时将生成值填充至函数实例的环境变量，使得函数实例在运行时可以读取该环境变量，约定环境变量的键在编译时与运行时保持一致，实现编译时生成值到运行时的传递。

### 基于 IaC 引擎的部署方式

针对前文提到的第一种部署方式，即基于 IaC 引擎的部署方式，我们可以利用 IaC 引擎自身提供的编排能力来具体实现。

编写基础设施定义代码时，基础设施配置语言（如 Pulumi、HCL 等）通常支持配置函数实例的环境变量，且支持将 Lazy 类型作为环境变量键值对的值。例如，Pulumi 在配置 AWS Lambda 实例的环境变量时，支持将 `pulumi.Input<string>` 和 `pulumi.Output<string>` 类型的值作为环境变量的值，而这两种类型的最终值都依赖于其他资源实例，即只有在其他资源实例被创建后才能获知的值。因此，Lazy 类型的使用会构成不同资源实例间的依赖关系，但我们不需要关心这类依赖关系，因为 IaC 引擎会进行处理，在执行基础设施定义代码时，IaC 引擎会按照合理的顺序先后创建不同实例，以保证在创建某函数实例，其依赖的 Lazy 值都已获取。

所以，Pluto 的实现思路是：生成的基础设施定义代码中，将函数实例依赖的编译时生成值，构建成 Lazy 类型变量，添加至函数实例的环境变量；在运行时，获取环境变量。这就完成了编译时生成值到运行时的传递。

### 直接调用 API 的部署方式

针对前文提到的第二种部署方式，即直接调用 API 的部署方式，该方式与第一种部署方式思路一致，但需要自主处理资源实例间的依赖关系，即这种部署方式下的适配器需要自主分析确定资源实例间的拓扑关系与创建顺序，保证在创建某函数实例，其依赖的编译时生成值都已获取。

**注意**：无论哪种部署方式，都不能出现资源间循环依赖的情况，否则将不能成功构建基础设施环境。

## 理想画面

```typescript filename="理想示例" {8-9,14-15}
const router = new Router();

router.get("/echo", async (req: HttpRequest): Promise<HttpResponse> => {
  const message = req.query["message"];
  return { statusCode: 200, body: message ?? "No message" };
});

// Can be used to display the resource's information to the user.
console.log(`This website's url is`, router.url);

const tester = new Tester("e2e");

tester.test("test echo", async () => {
  // Can be used in the unit testing to verify the correctness of business logic.
  const res = await fetch(router.url + "/echo?message=Hello%20Pluto!");
  const body = await res.text();
  expect(res.status).toBe(200);
  expect(body).toBe("Hello Pluto!");
});
```

函数执行时通常依赖资源对象的某个属性，来完成其功能目标。例如，该示例中两次访问 `router` 的 `url` 属性，一次是在全局作用域内通过打印 `router.url` 向用户反馈部署后的访问地址是什么；另一次是在 `tester.test` 方法中，利用 `router.url` 来完成业务逻辑正确性的检查。而 `router` 的 `url` 属性只有在 `router` 被创建后才能获知，也就是本文一直关注的情况。

这里，我们将访问资源对象的属性值作为用户访问编译时生成值的唯一方式，也就是，将编译时生成的值约束为资源类型的属性。那么，本文问题转化为，构建一种机制，使得函数在运行时可以访问资源对象在编译时生成的属性值。当然还是基于环境变量来实现。

## 实现思路

### 环境变量名称的生成规则

每个资源拥有在项目中的唯一 ID `resourceId`，每个资源类型的属性有唯一的名称，因此，在运行时与编译时，针对具体某资源对象的某属性，其对应的环境变量的名称约定为 `upperCase(resourceType + "_" + resourceId + "_" + propertyName)`。在具体实现时，提供一个工具函数 `propEnvName` 用来生成该名称。

```typescript filename="utils.ts"
export function propEnvName(resourceType: string, resourceId: string, propertyName: string) {
  const envName = `${resourceType}_${resourceId}_${propertyName}`
    .toUpperCase()
    .replace(/[^a-zA-Z0-9_]/g, "_");
  return envName;
}
```

以上面示例中的 `router` 为例，假设其资源类型为 `@plutolang/pluto.Router`，ID 为 `myRouter`，则 `router.url` 对应的环境变量名称为 `_PLUTOLANG_PLUTO_ROUTER_MYROUTER_URL`。

### CapturedProperty 接口标识特殊属性

Infra API、Client API 时在编译时需要检测并处理的两类接口方法，同样的，本文关注的此类资源类型的属性值也需要在编译时特殊关注，因为只有将函数实例各自依赖的资源属性体现在程序的参考架构中，我们才能将其配置在生成的基础设施定义代码中，或告知 Adapter。因此，我们定义一个名为 `CapturedProperty` 的接口，扩展了该接口的子接口，其中包含的 getter 方法，就是只有在创建后才会生成具体值的属性。

针对**基于 IaC 引擎的部署方式**，我们会生成基础设施定义代码，在编译时，将该类属性配置到函数实例的环境变量中，在运行时则是从环境变量读取具体的值。在编译时的操作与 Infra SDK 相关，而运行时的操作则与 Client SDK 相关，所以，该类属性与两类 SDK 都相关，这造成了在实现上的复杂性。

为了尽可能避免复杂性引发的问题，我们约定 Client SDK 与 Infra SDK 都对 `CapturedProperty` 接口进行实现，但两者功能与行为都不相同。Client SDK 中的实现只负责读取环境变量，解析后返回给业务代码。Infra SDK 中的实现只负责构建该属性的 Lazy 类型对象。而环境变量的配置过程则在计算闭包的创建阶段，在该阶段会调用资源对象的属性，将获取到的 Lazy 对象添加至计算闭包的依赖列表中，最终配置到其对应的函数实例上。

针对**直接调用 API 的部署方式**，其部署与 Infra SDK 无关，适配器需要自行获取各个函数实例依赖的资源属性，并将其配置到函数实例的环境变量中。

### 基础设施定义代码生成策略

1. 推导器根据 `CapturedProperty` 推导各个计算闭包依赖资源对象属性值，推导结果体现在程序的参考架构中。
   1. 推导方法：检测是否访问了资源对象的属性值，且属性值所在接口扩展了 `CapturedProperty` 接口。
2. 生成器根据参考架构生成基础设施定义代码，在构建计算闭包对象时，将计算闭包的依赖，包括属性访问与 Client API 调用，添加至计算闭包的 `dependencies` 属性中，Infra API 在构建函数资源实例时，提取计算闭包对象的所有依赖，如果是属性依赖，则将构建一个键值对，配置至函数实例的环境变量中。

以下代码为理想画面中示例代码对应基础设施定义代码。

```typescript
const router = new Router();

import { default as closure_fn_1 } from "./clourse_1";
const closure_1 = closure_fn_1 as ComputeClosure & typeof closure;
closure_1.filepath = "./clourse_1/index.ts";
closure_1.dependencies = [];
router.get("/echo", closure_1);

const tester = new Tester("e2e");

import { default as closure_fn_2 } from "./clourse_2";
const closure_2 = closure_fn_2 as ComputeClosure & typeof closure;
closure_2.filepath = "./clourse_2/index.ts";
closure_2.dependencies = [
  {
    resourceObject: router,
    resourceType: "@plutolang/pluto.Router",
    type: "proptery",
    method: "url",
  },
];
tester.test("test echo", closure_2);

import { default as closure_fn_main } from "./main_closure";
const main_closure = closure_fn_main as ComputeClosure & typeof closure;
main_closure.filepath = "./main_closure/index.ts";
main_closure.dependencies = [
  {
    resourceObject: router,
    resourceType: "@plutolang/pluto.Router",
    type: "proptery",
    method: "url",
  },
];
new Function(main_closure);
```

## 使用流程

接下来，我们以理想画面中的 `router.url` 属性为例，并基于 Pulumi 和 AWS ApiGateway 实现，说明 SDK 开发者在开发 Infra SDK 与 Client SDK 时，如何使用本文设计的机制。

### 整体步骤

1. 在 Router 资源类型的类声明文件中，定义 `RouterCapturedPropterty` 接口，该接口扩展基础库的 `CapturedPropterty` 接口，包含 `get url()` 方法。
2. Infra SDK 中的 Router 实现类实现 `RouterCapturedPropterty` 接口，实现的内容是：获取相应属性在编译时的值，该值可能是 Lazy 值。
3. Client SDK 中的 Router 实现类实现 `RouterCapturedPropterty` 接口，实现的内容是：根据资源类型、资源对象 ID、属性名称构建 Key，获取相应环境变量的值 —— 运行时需要的真实数据。

### 定义接口

在 Router 的类声明文件 `@plutolang/pluto/src/router.ts` 中，定义 `RouterCapturedPropterty` 接口，包含 url 的 getter 方法，并被 `Router` 接口扩展。这样开发者在业务开发时可以通过 TypeScript 的类型检查，并有补全提示。

```typescript
export interface RouterCapturedPropterty extends CapturedPropterty {
  get url(): string;
}

export interface RouterClientApi extends ResourceClientApi {}

export interface RouterInfraApi extends ResourceInfraApi {
  get(path: string, fn: RequestHandler): void;
  // more methods...
}

export interface Router extends RouterClientApi, RouterInfraApi, RouterCapturedPropterty {}
```

### Client SDK 实现

Router 在 Client SDK 的实现类，实现 `RouterCapturedPropterty` 与 `RouterClientApi` 接口。在 `url` 方法中，调用 base 库提供的工具函数，获取环境变量的值，并返回给用户。如果是复杂类型的值，则在该方法中进行解析验证，然后返回给用户。

```typescript
export class ApiGatewayRouter implements RouterClientApi {
  // ...
  public get url(): string {
    return getGeneratedPropertyValue(
      /* Resource type */ Router.name,
      /* Resource id */ this.id,
      /* Method name */ "url"
    );
  }
}

// utils.ts
export function getGeneratedPropertyValue(
  resourceType: string,
  resourceId: string,
  propertyName: string
): string {
  const envName = propEnvName(resourceType, resourceId, propertyName);
  const value = process.env[envName];
  if (!value) {
    throw new Error(
      `The '${propertyName}' of the '<${resourceType}>${resourceId}' cannot be found.`
    );
  }
  return value;
}
```

### Infra SDK 实现

Infra 实现类部分，则构建属性的 Lazy 值，并返回。由于编译时无法获得 URL 的准确值，而是 `pulumi.Output<string>` 类型，因此需要强制修改为 any，来通过 TypeScript 的类型检查。

```typescript
export class ApiGatewayRouter
  extends pulumi.ComponentResource
  implements RouterInfraApi, ResourceInfra
{
  // ...
  public get url(): string {
    return pulumi.interpolate`https://${this.apiGateway.id}.execute-api.${region}.amazonaws.com/${DEFAULT_STAGE_NAME}` as any;
  }
}
```
