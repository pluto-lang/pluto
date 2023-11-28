# SDK Extension Guide

This document will use the official SDK as an example to introduce the extension methods of the SDK, namely how to extend `@plutolang/pluto` and `@plutolang/pluto-infra`.

If you encounter any unclear concepts or unexplained terms in this document, please refer to the ["How the SDK Works"](../en/concepts/sdk.md) for more information.

## Overall Process

- Adding a new resource type
  - Define two types of functional interfaces in the Client SDK:
    - An interface for defining runtime functionality methods, called the Client Interface.
    - An interface for defining infrastructure-related methods, called the Infra Interface.
  - Define a resource operation interface in the Client SDK to expose the functionality methods for the resource.
- Adding a new implementation for the resource type
  - Create a class implementation for the Client Interface in the Client SDK and bind it through the `buildClient` method of the resource type.
  - Create a class implementation for the Infra Interface and `base.ResourceInfra` interface in the Infra SDK, and register it to the registry using the `Registr.register` method.

Next, we will use the Message Queue (Queue) as a new resource type and AWS SNS as the component used, to explain the complete extension process.

![resource class diagram](../../assets/resource-class-diagram.png)

## Adding a New Resource Type

Create a new file named `queue.ts` in the `src` directory of the `@plutolang/pluto` dependency library, and complete the following steps in this new file.

### Define the Client Interface

The methods defined in the Client Interface are the runtime functional methods that are dynamically called. As a message queue, the Queue currently includes a `push` method for users to send messages to the corresponding queue.

```typescript
// The client interface is used to define the methods for accessing resources that are used during runtime.
export interface QueueClient {
  push(msg: string): Promise<void>;
}
```

### Define the Infra Interface

The methods defined in the Infra Interface are used to build resource associations between the invocation object and its parameters, typically used for consuming that invocation object.

As a message queue, the Queue usually allows creating a subscriber to consume the messages published in the Queue. The method for creating a subscriber is called `subscribe`. The `subscribe` method takes an `EventHandler` type object as a parameter. The `EventHandler` type is a function type interface that inherits the `base.FnResource` interface, indicating that the `EventHandler` type is a FaaS resource type.

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

### Define the resource operation interface exposed to users

The resource operation interface exposed to users consists of a pair of classes and interfaces with the same name. The interface inherits both the client interface and the infrastructure interface, while the class only defines the constructor and a static `buildClient` method. This leverages the TypeScript feature of type merging, allowing the class to provide sufficient hints to developers even though it does not implement the interface methods.

Here, the resource class should be treated as an equivalent of an abstract class, which will not be instantiated and used in the end. However, users will still instantiate this class for usage in development. It's not declared as an abstract class because if developers try to create an instance of an abstract class, it would cause an error.

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

## Adding a New Implementation for the Resource Type

### Create a Client Implementation Class

In the `src/clients/aws` directory of `@plutolang/pluto`, create an `snsQueue.ts` file. The file and the class it contains are usually named after the component and the type.

In this file, the `SNSQueue` class implements the `QueueClient` interface using the AWS SDK. When calling the `PublishCommand` in the aws-sdk, the ARN of the SNS topic needs to be specified. Here, the ARN is constructed by concatenating the required parameters obtained from the environment variables, which are set in the aws `runtime.ts` of `@plutolang/pluto-infra`.

_Currently, there is no effective solution on how to transfer the information generated during compilation to the runtime for effective use._

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

After implementing the `SNSQueue` class, it needs to be created at runtime based on the runtime type. Therefore, in the `src/clients/aws/index.ts` of `@plutolang/pluto`, export this class and, in the `buildClient` method of the `Queue` class under `src`, instantiate the corresponding implementation class based on the runtime type.

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

### Create an Infrastructure Implementation Class

In the `src/aws` directory of `@plutolang/pluto-infra`, create an `snsQueue.ts` file. The file and the class it contains are usually named after the component and the type. In this file, the `SNSQueue` class needs to implement the `ResourceInfra` and `QueueInfra` interfaces. Typically, the creation process of the main components is defined in the constructor, and the association with other resources is built in other methods. Note that the operation names in `getPermission` should correspond to the functions in the client interface.

Currently, Pluto supports implementation based on Pulumi and will support more IaC tools in the future.

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

After implementing the `SNSQueue` class, it needs to be registered to the registry in order to instantiate the corresponding implementation class for the target platform during deployment. In the `src/aws/index.ts` of `@plutolang/pluto-infra`, export this class and add the following statement in the `register` method of `src/index.ts` to register it:

```typescript
reg.register(runtime.Type.AWS, engine.Type.pulumi, Queue, aws.SNSQueue);
```

With this, the extension of the BaaS resource type is completed.

## Note

Not all resources have both the Client Interface and the Infra Interface.

For example, the Router resource only has the Infra Interface and does not have the Client Interface, meaning the Router type does not have any functional methods for the compute module to call during runtime.

The KVStore resource only has the Client Interface and does not have the Infra Interface, indicating that the Router type currently does not have the need to establish triggering associations with other resources.

It is important to note that whether there is an Infra Interface or not, if it's a type of cloud resource, there needs to be an infrastructure implementation class that completes the resource creation in its constructor.
