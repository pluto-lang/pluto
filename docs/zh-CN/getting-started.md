# Pluto 轻松构建云应用：开发指南

开发者只需在代码中定义一些变量，[Pluto](https://github.com/pluto-lang/pluto) 就能基于这些变量自动创建与管理必要的云资源组件，达到简化部署和管理云基础设施的目的，让开发者更容易使用云。

这里的云资源并非指 IaaS，而是指 BaaS、FaaS 等托管资源组件。这类托管组件相较于自建实例通常具有更高的可靠性与更低的成本。

这篇文章将介绍 Pluto 的安装步骤与示例，帮助开发者熟悉 Pluto 的特性。

## 安装

### 前置条件

- [Node.js](https://nodejs.org/en/): Pluto 支持使用 TypeScript 编写云应用程序。
- [Pulumi](https://www.pulumi.com/docs/install/): Pluto 使用 Pulumi 与云平台（AWS 或 K8s）进行交互，部署云资源。

### Pluto CLI

Pluto 命令行工具利用 [npm](https://www.npmjs.com/) 进行安装:

```shell
npm install -g @plutolang/cli
```

验证是否安装成功:

```shell
pluto --version
```

## Hello, Pluto

接下来，开始创建并部署一个 Pluto 项目。

### 创建 Pluto 项目

通过运行以下命令，使用 Pluto CLI 创建 Pluto 项目:

```shell
pluto new
```

该命令将交互式地创建一个项目，并使用提供的项目名称创建一个目录。下面是一个输出示例：

```
$ pluto new
? Project name hello-pluto
? Stack name dev
? Select a platform AWS
? Select an IaC engine Pulumi
Info:  Created a project, hello-pluto
```

### 编写业务代码

使用你习惯的编辑器，在 `<project_root>/src/index.ts` 编写如下代码：

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

这段代码包含 3 个资源变量和 2 个处理过程：

- 一个 HTTP 服务 router，接受 `/access` HTTP 请求，请求中将本次的访问时间发布到消息队列 queue，然后从 KV 数据库 kvstore 中获取上一次访问时间，并返回。
- 一个消息队列 queue，有一个订阅者，将消息队列中的消息保存到 KV 数据库 kvstore 中。
- 一个 KV 数据库 kvstore，用来保存用户的上一次访问时间。

### 部署应用

执行下面这条命令就能将应用发布到最初配置的云平台上：

```shell
pluto deploy
```

如果你指定的云平台是 AWS，请确保 `AWS_REGION` 环境变量被正确配置，例如：

```shell
export AWS_REGION=us-east-1
```

<p align="center">
  <img src="http://cdn.zhengsj.cn/ob-1700630203893.png" alt="aws arch" width="400">
</p>

Pluto 将会在你指定的云平台上创建 3 个资源组件和 2 个函数对象，以 AWS 为例，将会创建：

- 1 个命名为 router 的 ApiGateway
- 1 个命名为 queue 的 SNS
- 1 个命名为 kvstore 的 DynamoDB
- 2 个名字以 function 开头的 Lambda 函数

#### 多平台部署

如果你想部署到其他云平台可以通过创建新的 stack，并在部署时指定 stack 的方式进行：

创建新的 stack：

```shell
pluto stack new
```

部署时指定 stack：

```shell
pluto deploy --stack <new_stack>
```

## 更多资源

- 示例：[基于 OpenAI 的命令行终端聊天机器人](https://github.com/pluto-lang/pluto/tree/main/examples/chat-bot)
- 示例：[每日一则计算机笑话](https://github.com/pluto-lang/pluto/tree/main/examples/daily-joke-slack)
- 实现：[Pluto | GitHub](https://github.com/pluto-lang/pluto)
- 在线 IDE： [Pluto | CodeSandbox](https://codesandbox.io/s/github/pluto-lang/codesandbox/tree/main/)
