# SDK 扩展指南

本篇文档将以官方 SDK 为例，介绍 SDK 的扩展方式，即如何扩展 `@plutolang/pluto` 和 `@plutolang/pluto-infra`。

如果在本篇文档中遇到不清楚且未解释的概念，请从[“SDK 工作原理”](../documentation/concepts/sdk.zh-CN.md)中了解。

## 整体过程

- 添加一种新的资源类型
  - 在 Client SDK 中定义两类功能接口
    - 定义运行时功能方法的接口，称作客户端接口（Client Interface）
    - 定义基础设施关联方法的接口，称作基础设施接口（Infra Interface）
    - 定义一个接口，包含编译时生成、运行时访问的属性，称作属性接口（Prop Interface）
  - 在 Client SDK 中定义暴露资源功能方法的资源操作界面。
- 添加资源类型的一种新实现
  - 在 Client SDK 中创建一个类实现客户端接口，并通过资源类型的 `buildClient` 中绑定该实现。
  - 在 Infra SDK 中创建一个类实现基础设施接口，及 `base.ResourceInfra` 接口，并通过 `Registr.register` 方法将其自身注册到注册中心。

接下来，以 消息队列 Queue 作为新的资源类型，并将 AWS 的 SNS 作为使用的组件，介绍完整扩展流程。

![resource class diagram](../../assets/resource-class-diagram.png)

## 添加新的资源类型

在 `@plutolang/pluto` 依赖库的 `src` 创建一个新文件 `queue.ts`，在该新文件中完成后续步骤。

### 定义客户端接口

客户端接口中定义的方法为运行时被动态调用的资源功能方法。

Queue 目前作为消息队列，会包含一个 push 方法，用户将消息发布到相应的队列。

```typescript
// The client interface is used to define the methods for accessing resources that are used during runtime.
export interface IQueueClientApi extends base.IResourceClientApi {
  push(msg: string): Promise<void>;
}
```

### 定义基础设施接口

基础设施接口中定义的方法用于构建调用对象与参数之间的资源关联，一般用于消费该调用对象。

Queue 作为消息队列，通常可以创建一个订阅者用于消费 Queue 中发布的消息，该创建方法即为 `subscribe`，`subscribe` 接收一个 `EventHandler` 类型对象作为参数，而 `EventHandler` 类型为一个函数类型接口，并继承了 `base.FnResource` 接口，表明 `EventHandler` 类型是一个函数计算资源类型。

```typescript
// The infra interface is used to define the methods for accessing resources that are used during compilation.
export interface IQueueInfraApi extends base.IResourceInfraApi {
  subscribe(fn: EventHandler): void;
}

export interface EventHandler extends base.FnResource {
  (evt: CloudEvent): Promise<void>;
}

export interface CloudEvent {
  timestamp: number;
  data: string;
}
```

### 定义属性接口

属性接口中定义了一组 getter 方法，这些方法对应的值，仅根据用户提供的数据是不足以得到的，例如只有在 apigateway 部署后才能知道的 router 的 url。Queue 目前没有此类属性需求，因此为空。

```typescript
export interface IQueueCapturedProps extends base.IResourceCapturedProps {}
```

### 定义暴露给用户的资源操作界面

暴露给用户的资源操作界面包含一对同名的类和接口，接口继承客户端接口和基础设施接口，而类中只定义构造函数和静态 `buildClient` 方法。这里利用了 TypeScript 的类型合并的特性，使得类虽然不实现接口方法，仍能给开发者足够的提示。

这里要求，将该资源类视作抽象类等同的存在，最终不会被实例化使用，但用户在开发时仍会通过实例化该类来使用。之所以没有将其设为抽象类，是开发者在开发时实例化抽象类将会报错。

```typescript
import {
  FnResource,
  IResource,
  IResourceCapturedProps,
  IResourceClientApi,
  IResourceInfraApi,
  runtime,
  simulator,
  utils,
} from "@plutolang/base";
import { aws, k8s } from "./clients";

export interface CloudEvent {
  timestamp: number;
  data: string;
}

export interface EventHandler extends FnResource {
  (evt: CloudEvent): Promise<void>;
}

/**
 * The options for instantiating an infrastructure implementation class or a client implementation
 * class.
 */
export interface QueueOptions {}

/**
 * Define the access methods for Queue that operate during runtime.
 */
export interface IQueueClientApi extends IResourceClientApi {
  push(msg: string): Promise<void>;
}

/**
 * Define the methods for Queue, which operate during compilation.
 */
export interface IQueueInfraApi extends IResourceInfraApi {
  subscribe(fn: EventHandler): void;
}

/**
 * Define the properties for Queue that are captured at compile time and accessed during runtime.
 */
export interface IQueueCapturedProps extends IResourceCapturedProps {}

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * client implementation class of a resource type.
 */
export type IQueueClient = IQueueClientApi & IQueueCapturedProps;

/**
 * Construct a type that includes all the necessary methods required to be implemented within the
 * infrastructure implementation class of a resource type.
 */
export type IQueueInfra = IQueueInfraApi & IQueueCapturedProps;

// TODO: abstract class
export class Queue implements IResource {
  constructor(name: string, opts?: QueueOptions) {
    name;
    opts;
    throw new Error(
      "Cannot instantiate this class, instead of its subclass depending on the target runtime."
    );
  }

  public static buildClient(name: string, opts?: QueueOptions): IQueueClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.SNSQueue(name, opts);
      case PlatformType.K8s:
        return new k8s.RedisQueue(name, opts);
      case PlatformType.Simulator:
        if (!process.env.PLUTO_SIMULATOR_URL) throw new Error("PLUTO_SIMULATOR_URL doesn't exist");
        return simulator.makeSimulatorClient(process.env.PLUTO_SIMULATOR_URL!, name);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }
}

export interface Queue extends IResource, IQueueClient, IQueueInfra {}
```

## 添加资源类型的一种新实现

### 创建 客户端 实现类

在 `@plutolang/pluto` 的 `src/clients/aws` 目录下，创建一个 `snsQueue.ts` 文件，文件与包含的类名通常以 组件名 + 类型名 来命名。

该文件主要通过使用 AWS SDK 实现 `IQueueClient` 接口，在使用 aws-sdk 调用 `PublishCommand` 时需要指定 SNS 主题的 ARN，这里采用拼接的方式构建 ARN，其中依赖的参数信息从环境变量获得，而环境变量在 `@plutolang/pluto-infra` 中 `queue.sns.ts` 的适配函数中设定。

```typescript
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { CloudEvent, IQueueClient, QueueOptions } from "../../queue";

/**
 * Implementation of Queue using AWS SNS.
 */
export class SNSQueue implements IQueueClient {
  private topicName: string;
  private client: SNSClient;

  constructor(name: string, opts?: QueueOptions) {
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
        TopicArn: await this.buildARN(this.topicName),
        Message: JSON.stringify(evt),
      })
    );
  }

  private async buildARN(topicName: string): Promise<string> {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("Missing AWS Region");
    }

    const accountId = await getAwsAccountId();

    return `arn:aws:sns:${region}:${accountId}:${topicName}`;
  }
}
```

实现完 SNSQueue 类后，需要供 FaaS 函数在运行时根据运行时类型创建，因此在 `@plutolang/pluto` 的 `src/clients/aws/index.ts` 中 export 该类，并在 `src` 下 `Queue` 类的 `buildClient` 方法中，根据运行时类型实例化相应实现类。

```typescript
...
  public static buildClient(name: string, opts?: QueueOptions): IQueueClient {
    const platformType = utils.currentPlatformType();
    switch (platformType) {
      case PlatformType.AWS:
        return new aws.SNSQueue(name, opts);
      case PlatformType.K8s:
        return new k8s.RedisQueue(name, opts);
      default:
        throw new Error(`not support this runtime '${platformType}'`);
    }
  }
...
```

### 创建 基础设施 基础抽象类

在 `@plutolang/pluto-infra` 的 `src/` 目录下，创建一个 `queue.ts`，在其中定义基础类要实现的接口，同时定义一个抽象类来根据平台与引擎实例化具体的实现类。下面实例中采用懒加载的方式导入相应具体实例，减少库的加载时间。

在实现时需要注意，实现类的构造函数 和 Queue 的静态方法 `createInstance` 的参数需要与 Client 实现类的构造函数参数 保持一致。

```typescript
import { ProvisionType, PlatformType, utils } from "@plutolang/base";
import { IQueueInfra QueueOptions } from "@plutolang/pluto";
import { ImplClassMap } from "./utils";

// Construct a type for a class constructor. The key point is that the parameters of the constructor
// must be consistent with the client class of this resource type. Use this type to ensure that
// all implementation classes have the correct and same constructor signature.
type QueueInfraImplClass = new (name: string, options?: QueueOptions) => IQueueInfra;

// Construct a map that contains all the implementation classes for this resource type.
// The final selection will be determined at runtime, and the class will be imported lazily.
const implClassMap = new ImplClassMap<IQueueInfra, QueueInfraImplClass>({
  [ProvisionType.Pulumi]: {
    [PlatformType.AWS]: async () => (await import("./aws")).SNSQueue,
    [PlatformType.K8s]: async () => (await import("./k8s")).RedisQueue,
  },
});

/**
 * This is a factory class that provides an interface to create instances of this resource type
 * based on the target platform and engine.
 */
export abstract class Queue {
  /**
   * Asynchronously creates an instance of the queue infrastructure class. The parameters of this function
   * must be consistent with the constructor of both the client class and infrastructure class associated
   * with this resource type.
   */
  public static async createInstance(name: string, options?: QueueOptions): Promise<IQueueInfra> {
    // TODO: ensure that the resource implementation class for the simulator has identical methods as those for the cloud.
    if (
      utils.currentPlatformType() === PlatformType.Simulator &&
      utils.currentEngineType() === ProvisionType.Simulator
    ) {
      return new (await import("./simulator")).SimQueue(name, options) as any;
    }

    return implClassMap.createInstanceOrThrow(
      utils.currentPlatformType(),
      utils.currentEngineType(),
      name,
      options
    );
  }
}
```

### 创建 基础设施 实现类

在 `@plutolang/pluto-infra` 的 `src/aws` 目录下，创建一个 `snsQueue.ts` 文件，文件与包含的类名通常以 组件名 + 类型名 来命名。

在该文件中，需要实现 `ResourceInfra` 和 `IQueueInfra` 接口。通常在构造函数中定义主要组件的创建过程，并在其他方法中构建与其他资源的关联。需要注意的是，`getPermission` 中的操作名称，应与客户端接口中的函数对应。

目前 Pluto 支持基于 Pulumi 实现，后续将支持更多 IaC 工具。

```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Resource, ResourceInfra } from "@plutolang/base";
import { IQueueInfra, QueueOptions } from "@plutolang/pluto";
import { Lambda } from "./lambda";
import { Permission } from "./permission";

export enum SNSOps {
  PUSH = "push",
}

export class SNSQueue extends pulumi.ComponentResource implements ResourceInfra, IQueueInfra {
  readonly name: string;
  public readonly topic: aws.sns.Topic;

  constructor(name: string, opts?: QueueOptions) {
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

在实现完 `SNSQueue` 类后，需要将其注册到 Queue 基础抽象类的映射表中， 在 `@plutolang/pluto-infra` 的 `src/queue.ts` 中，在 `implClassMap` 中添加一条记录：

```typescript {3}
const implClassMap = new ImplClassMap<IQueueInfra, QueueInfraImplClass>({
  [ProvisionType.Pulumi]: {
    [PlatformType.AWS]: async () => (await import("./aws")).SNSQueue,
    [PlatformType.K8s]: async () => (await import("./k8s")).RedisQueue,
  },
});
```

至此， BaaS 资源类型的扩展就完成了。

## 注

并非所有资源都同时拥有客户端接口和基础设施接口，例如，Router 资源只有基础设施接口，没有客户端接口，即 Router 类型没有功能方法供计算模块在运行过程中调用；KVStroe 资源只有客户端接口，没有基础设施接口，即 KVStore 类型目前没有与其他资源建立触发关联的需求。需要注意的是，无论是否有基础设施接口，都需要有基础设施实现类，并在其构造函数中完成资源的创建。
