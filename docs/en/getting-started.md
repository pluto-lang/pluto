# Building Cloud-Native Applications Made Easy with Pluto: A Guide for Developers

By simply defining variables in their code, developers can allow [Pluto](https://github.com/pluto-lang/pluto) to automatically create and manage the required cloud resource components. This simplifies the process of deploying and managing cloud infrastructure, enabling developers to make better use of the cloud.

In the context, cloud resources do not refer to Infrastructure as a Service (IaaS), but rather to managed resource components such as Backend as a Service (BaaS) and Function as a Service (FaaS). These managed components generally provide enhanced reliability and cost-effectiveness compared to building and managing your own instances.

In this article, we will guide you through the steps of getting started with Pluto and help you become familiar with its features.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/en/): Pluto supports writing cloud applications using TypeScript.
- [Pulumi](https://www.pulumi.com/docs/install/): Pluto uses Pulumi to interact with cloud platforms (such as AWS or Kubernetes) and deploy cloud resources.

### Pluto CLI

The Pluto command-line tool is distributed via [npm](https://www.npmjs.com/). Install it by running the following command:

```shell
npm install -g @plutolang/cli
```

Verify your installation:

```shell
pluto --version
```

## Hello, Pluto

Now, let's get started with your first Pluto program.

### Create your project

Create a Pluto project using the Pluto CLI by running:

```shell
pluto new
```

This command will interactively create a project and create a directory with the provided project name. Here's an example:

```
$ pluto new
? Project name hello-pluto
? Stack name dev
? Select a platform AWS
? Select an IaC engine Pulumi
Info:  Created a project, hello-pluto
```

### Write your business logic

Use your preferred code editor to write the following code in `<project_root>/src/index.ts`:

```typescript
import { Router, Queue, KVStore, CloudEvent, HttpRequest, HttpResponse } from "@plutolang/pluto";

const router = new Router("router");
const queue = new Queue("queue");
const kvstore = new KVStore("kvstore");

// Publish the access time to the queue, and respond with the last access time.
router.get("/access", async (req: HttpRequest): Promise<HttpResponse> => {
  const name = req.query["name"] ?? "Anonym";
  await queue.push(JSON.stringify({ name, accessAt: `${Date.now()}` }));
  const lastAccess = await kvstore.get(name).catch(() => undefined);
  const respMsg = lastAccess
    ? `Hello, ${name}! The last access was at ${lastAccess}`
    : `Hello, ${name}!`;
  return { statusCode: 200, body: respMsg };
});

// Subscribe to messages in the queue and store them in the KV database.
queue.subscribe(async (evt: CloudEvent): Promise<void> => {
  const data = JSON.parse(evt.data);
  await kvstore.set(data["name"], data["accessAt"]);
  return;
});
```

<p align="center">
  <img src="http://cdn.zhengsj.cn/ob-1700630175532.png" alt="case arch" width="450">
</p>

This code includes 3 resource variables and 2 processes:

- An HTTP service called "router" that accepts `/access` HTTP requests. It publishes the access time to the message queue "queue" and retrieves the last access time from the KV database "kvstore" and returns it in the response.
- A message queue named "queue" with a subscriber that saves messages from the queue to the KV database "kvstore".
- A KV database named "kvstore" used to store users' last access time.

### Deploy your application

To deploy your application to the cloud platform you configured initially, run the following command:

```shell
pluto deploy
```

If you specified AWS as the cloud platform, make sure the `AWS_REGION` environment variable is correctly configured, for example:

```shell
export AWS_REGION=us-east-1
```

<p align="center">
  <img src="http://cdn.zhengsj.cn/ob-1700630203893.png" alt="aws arch" width="400">
</p>

Pluto will create 3 resource components and 2 function objects on the specified cloud platform. For example, if you chose AWS, it will create:

- An ApiGateway named "router"
- An SNS named "queue"
- A DynamoDB named "kvstore"
- Two Lambda functions starting with "function"

#### Multi-platform deployment

If you want to deploy to another cloud platform, you can create a new stack and specify the stack during deployment. Here are the steps:

Create a new stack:

```shell
pluto stack new
```

Specify the stack during deployment:

```shell
pluto deploy --stack <new_stack>
```

## More Resources

- Example: [Command-line chatbot based on OpenAI](https://github.com/pluto-lang/pluto/tree/main/examples/chat-bot)
- Example: [Share a daily computer joke on Slack](https://github.com/pluto-lang/pluto/tree/main/examples/daily-joke-slack)
- Repository: [Pluto | GitHub](https://github.com/pluto-lang/pluto)
- Playground: [Pluto | CodeSandbox](https://codesandbox.io/s/github/pluto-lang/codesandbox/tree/main/)
