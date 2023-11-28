# SDK 扩展指南

本篇文档将以官方 SDK 为例，介绍 SDK 的扩展方式，即如何扩展 `@plutolang/pluto` 和 `@plutolang/pluto-infra`。

如果在本篇文档中遇到不清楚且未解释的概念，请从[“SDK 工作原理”](../zh-CN/concepts/sdk.md)中了解。

## 整体过程

- 添加一种新的资源类型
  - 在 Client SDK 中定义两类功能接口
    - 用于定义运行时功能方法的接口，称作客户端接口（Client Interface）
    - 用于定义基础设施关联方法的接口，称作基础设施接口（Infra Interface）
  - 在 Client SDK 中定义暴露资源功能方法的资源操作界面。
- 添加资源类型的一种新实现
  - 在 Client SDK 中创建一个类实现客户端接口，并通过资源类型的 buildClient 中绑定该实现。
  - 在 Infra SDK 中创建一个类实现基础设施接口，及 base.ResourceInfra 接口，并通过 Registr.register 方法将其自身注册到注册中心。

接下来，以 消息队列 Queue 作为新的资源类型，并将 AWS 的 SNS 作为使用的组件，介绍完整扩展流程。

![resource class diagram](../../assets/resource-class-diagram.png)

## 添加新的资源类型

在 `@plutolang/pluto` 依赖库的 src 创建一个新文件 `queue.ts`，在该新文件中完成后续步骤。

### 定义客户端接口

客户端接口中定义的方法为运行时被动态调用的资源功能方法。

Queue 目前作为消息队列，会包含一个 push 方法，用户将消息发布到相应的队列。

```typescript
// The client interface is used to define the methods for accessing resources that are used during runtime.
export interface QueueClient {
  push(msg: string): Promise<void>;
}
```

### 定义基础设施接口

基础设施接口中定义的方法用于构建调用对象与参数之间的资源关联，一般用于消费该调用对象。

Queue 作为消息队列，通常可以创建一个订阅者用于消费 Queue 中发布的消息，该创建方法即为 subscribe，subscribe 接收一个 EventHandler 类型对象作为参数，而 EventHandler 类型为一个函数类型接口，并继承了 base.FnResource 接口，表明 EventHandler 类型是一个函数计算资源类型。

```typescript
import { FnResource } from "@plutolang/base";

// The infra interface is used to define the methods for accessing resources that are used during compilation.
export interface QueueInfra {
  subscribe(fn: EventHandler): void;
}

export interface EventHandler extends FnResource {
  (evt: CloudEvent): Promise<void>;
}

export interface CloudEvent {
  timestamp: number;
  data: string;
}
```

### 定义暴露给用户的资源操作界面

暴露给用户的资源操作界面包含一对同名的类和接口，接口继承客户端接口和基础设施接口，而类中只定义构造函数和静态 buildClient 方法。这里利用了 TypeScript 的类型合并的特性，使得类虽然不实现接口方法，仍能给开发者足够的提示。

这里要求，将该资源类视作抽象类等同的存在，最终不会被实例化使用，但用户在开发时仍会通过实例化该类来使用。之所以没有将其设为抽象类，是开发者在开发时实例化抽象类将会报错。

```typescript
import { Resource, runtime } from "@plutolang/base";
import { aws, k8s } from "./clients";

export class Queue implements Resource {
  constructor(name: string, opts?: QueueOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: QueueClientOptions): QueueClient {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.K8s:
        return new k8s.RedisQueue(name, opts);
      default:
        throw new Error(`not support this runtime '${rtType}'`);
    }
  }
}

export interface Queue extends QueueInfra, QueueClient, Resource {}

export interface QueueInfraOptions {}
export interface QueueClientOptions {}
export interface QueueOptions extends QueueInfraOptions, QueueClientOptions {}
```

## 添加资源类型的一种新实现

### 创建 客户端 实现类

在 `@plutolang/pluto` 的 src/clients/aws 目录下，创建一个 `snsQueue.ts` 文件，文件与包含的类名通常以 组件名 + 类型名 来命名。

该文件主要通过使用 AWS SDK 实现 QueueClient 接口，在使用 aws-sdk 调用 PublishCommand 时需要指定 SNS 主题的 ARN，这里采用拼接的方式构建 ARN，其中依赖的参数信息从环境变量获得，而环境变量在 `@plutolang/pluto-infra` 的 aws runtime.ts 设定。

_编译时生成的信息如何有效传输至运行时使用，目前尚未有有效的解决方案。_

```typescript
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { CloudEvent, QueueClient, QueueClientOptions } from "../../queue";

/**
 * Implementation of Queue using AWS SNS.
 */
export class SNSQueue implements QueueClient {
  private topicName: string;
  private client: SNSClient;

  constructor(name: string, opts?: QueueClientOptions) {
    this.topicName = name;
    this.client = new SNSClient({});
    opts;
  }

  public async push(msg: string): Promise<void> {
    const evt: CloudEvent = {
      timestamp: Date.now(),
      data: msg,
    };
    await this.client.send(
      new PublishCommand({
        TopicArn: this.buildARN(this.topicName),
        Message: JSON.stringify(evt),
      })
    );
  }

  private buildARN(topicName: string): string {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("Missing AWS Region");
    }

    const accountId = process.env.AWS_ACCOUNT_ID;
    if (!accountId) {
      throw new Error("Missing AWS Account ID");
    }

    return `arn:aws:sns:${region}:${accountId}:${topicName}`;
  }
}
```

实现完 SNSQueue 类后，需要供 FaaS 函数在运行时根据运行时类型创建，因此在 `@plutolang/pluto` 的 src/clients/aws/index.ts 中 export 该类，并在 src 下 Queue 类的 buildClient 方法中，根据运行时类型实例化相应实现类。

```typescript
...
public static buildClient(name: string, opts?: QueueClientOptions): QueueClient {
    const rtType = process.env["RUNTIME_TYPE"];
    switch (rtType) {
      case runtime.Type.AWS:
        return new aws.SNSQueue(name, opts);
      case runtime.Type.K8s:
        return new k8s.RedisQueue(name, opts);
      default:
        throw new Error(`not support this runtime '${rtType}'`);
    }
...
```

### 创建 基础设施 实现类

在 `@plutolang/pluto-infra` 的 src/aws 目录下，创建一个 `snsQueue.ts` 文件，文件与包含的类名通常以 组件名 + 类型名 来命名。

在该文件中，需要实现 ResourceInfra 和 QueueInfra 接口。通常在构造函数中定义主要组件的创建过程，并在其他方法中构建与其他资源的关联。需要注意的是，getPermission 中的操作名称，应与客户端接口中的函数对应。

目前 Pluto 支持基于 Pulumi 实现，后续将支持更多 IaC 工具。

```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Resource, ResourceInfra } from "@plutolang/base";
import { QueueInfra, QueueInfraOptions } from "@plutolang/pluto/dist/queue";
import { Lambda } from "./lambda";
import { Permission } from "./permission";

export enum SNSOps {
  PUSH = "push",
}

export class SNSQueue extends pulumi.ComponentResource implements ResourceInfra, QueueInfra {
  readonly name: string;
  public readonly topic: aws.sns.Topic;

  constructor(name: string, opts?: QueueInfraOptions) {
    super("pluto:queue:aws/SNS", name, opts);
    this.name = name;

    this.topic = new aws.sns.Topic(
      name,
      {
        name: name,
        tags: {
          "dapr-topic-name": name,
        },
      },
      { parent: this }
    );
  }

  public subscribe(fn: Resource): void {
    if (!(fn instanceof Lambda)) throw new Error("Fn is not a subclass of LambdaDef.");
    const lambda = fn as Lambda;

    const resourceNamePrefix = `${this.name}-${lambda.name}`;

    // create topic subscription
    new aws.sns.TopicSubscription(
      `${resourceNamePrefix}-subscription`,
      {
        endpoint: lambda.lambda.arn,
        protocol: "lambda",
        topic: this.topic.arn,
      },
      { parent: this }
    );

    // create sns trigger
    new aws.lambda.Permission(
      `${resourceNamePrefix}-httpTrigger`,
      {
        action: "lambda:InvokeFunction",
        function: lambda.lambda.name,
        principal: "sns.amazonaws.com",
        sourceArn: this.topic.arn,
      },
      { parent: this }
    );
  }

  public getPermission(op: string): Permission {
    const actions = [];
    switch (op) {
      case SNSOps.PUSH:
        actions.push("sns:Publish");
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }

    return {
      effect: "Allow",
      actions: actions,
      resources: [this.topic.arn],
    };
  }

  public postProcess() {}
}
```

在实现完 `SNSQueue` 类后，需要将其注册到注册中心以实现在部署时实例化目标平台对应的实现类。在 `@plutolang/pluto-infra` 的 src/aws/index.ts 将该类 export，并在 src/index.ts 中的 register 方法中添加下列语句，实现注册：

```typescript
reg.register(runtime.Type.AWS, engine.Type.pulumi, Queue, aws.SNSQueue);
```

至此， BaaS 资源类型的扩展就完成了。

## 注

并非所有资源都同时拥有客户端接口和基础设施接口，例如，Router 资源只有基础设施接口，没有客户端接口，即 Router 类型没有功能方法供计算模块在运行过程中调用；KVStroe 资源只有客户端接口，没有基础设施接口，即 Router 类型目前没有与其他资源建立触发关联的需求。需要注意的是，无论是否有基础设施接口，都需要有基础设施实现类，并在其构造函数中完成资源的创建。
