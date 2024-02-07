---
title: 云真的成为基础设施了吗？
date: 2023-10-27
description: Pluto 希望想利用编程语言来降低开发者使用云的门槛，同时仍能享受现有语言生态的便利性，极致地保障开发者的编程体验。所以，Pluto 对 TypeScript 进行了“翻新”...
---

# 云真的成为基础设施了吗？

## 云是基础设施吗 🤔️

> 基础设施是为一个国家、城市或其他地区服务的一套设施和系统，包括其经济、家庭和企业运作所必需的服务和设施。 ——维基百科

从概念意义上讲，的确，云已经成为了基础设施。但是，你想一下，你在使用电饭煲的时候，你会去考虑你使用的电是水电，还是火电吗？那你在开发应用程序的时候，你是否需要考虑要部署到 AWS 上？还是 Kubernetes 上？云远没有像电一样方便使用。从实用意义上讲，云还没有成为真正的基础设施，有效的接入方式或许是其中一个缺失项。

## 现在如何使用云的 ☁️

云提供了丰富的能力，包括负载均衡、函数计算、对象存储等，而你是如何使用这些能力的？让我猜一下：你先登录到 AWS 的控制台，在数百种资源中找到 DynamoDB，进入配置页面创建一个 Table。然后你去 Lambda 页面创建两个函数，边查看 DynamoDB SDK 的文档，边将你超凡脱俗的想法实现。在一次查阅 SDK 文档后，嗯？我刚才要做什么来着？Table 设置的 Key 是什么来着？我写入数据为什么会失败？IAM、ARN 都是什么？学习使我快乐 😵。OMG，我只是想开发一段简单程序啊 😤。终于在不断的部署—测试中完成了功能开发，你再去 ApiGateway 的配置页面创建两个 Route、一个 Deployment，发布。终于，你完成了一个云应用的全部开发。

整个过程困难重重，仿佛在参加 3 千米障碍跑，而你只是想开发一个云应用。你说你了解 Terraform、Pulumi？但是仍少不了去学习各种云能力、IaC 工具的使用，对吗？这绝不是一种好的开发体验。

## 编程语言是钥匙 🔑

怎么才能让我能够专注于我的创新应用？回顾计算机历史可以发现，编程语言是打开计算机世界的钥匙，程序员通过编程语言与计算机世界进行交互。从二进制编码到汇编，从 C 到 Python，人类的认知负担越来越低，开发者编程时不再需要关心 CPU 架构、指令集，一切向好。

面向云开发的应用程序仿佛又回到了原点，或许是时候再创造一门新的编程语言了？“什么？！又是一门新的编程语言？我的确希望减轻我使用云的压力，但是我也不想放弃各种方便使用的库！”

我们既想利用编程语言这把钥匙来**降低开发者使用云的门槛，又不想放弃现有语言的生态，极致地保障开发者的编程体验**。于是我们诞生了一个想法 💡：让现有的一门编程语言成为新的编程语言。也就是说，保持现有语言的语法、生态，但是我们对它重新编译，是面向云的编译，让它成为云开发世界的钥匙。

[Plutolang](https://github.com/pluto-lang/pluto) 就是这样一款产品，我们始终认为一款产品**不应该强迫开发者采用任何特定的方式编写应用程序，而应该是集成到开发者的工作流程中**，让开发者变得更轻松。人们想要的是能改善生活的简单解决方案！

## 常用语言翻新 🤸‍♀️

当前编程世界有非常多的编程语言，他们绝大多数都被设计成面向单机环境运行，我们该如何对他们进行“翻新”，来让它们能够自然的在云上分布式地运行呢？我们在 TypeScript 这门语言上进行了初步尝试。

首先，回想一下，我们平常是如何开发一个单机应用程序的？如果我需要保存一组键值对以供后续使用，只需要创建一个 Map 对象就好。我可以在一份代码文件中，定义一个 Web 服务器的多个路由处理函数。这些操作都很简单方便，我们目标是要保留这种开发体验。

因此，我们从最常用的扩展方式—依赖库着手，用户之前可能会使用 `express` 作为依赖库，而现在改为使用 `@plutolang/pluto`：

```typescript
import { KVStore, Router, HttpRequest, HttpResponse } from "@plutolang/pluto";

const kvstore = new KVStore("pluto");
const router = new Router("pluto");
router.get("/hello", async (req: HttpRequest): Promise<HttpResponse> => {
	await kvstore.set("hello", "pluto");
	return {
		statusCode: 200,
		body: "Hello, Pluto";
	}
});
```

开发者仍然是定义一个个应用需要的变量，编写一个个的路由处理函数，就像往常一样。在经过编译后，kvstore、router 等变量就会成为一个个云上的组件资源（如 DynamoDB、ApiGateway 等），而定义的路由处理函数将成为云上的一个 Lambda 函数，自然地享受云所提供的按量计费、快速扩缩等特性。

![](http://cdn.zhengsj.cn/ob-1698301951197.png)

这背后的主要思路是：从用户代码中推导出应用程序所依赖的云资源，以及资源间的依赖关系，构建出云资源拓扑图，也就是针对云环境的参考架构（Architecture Reference）。进一步对用户代码进行拆分、改写，导出多个计算模块，同时依赖于参考架构，可以生成一份**与用户代码不直接相关**的基础设施代码，其中包含对资源的定义与计算模块的发布。最终，执行这份基础设施代码就能创建与部署应用程序在云上的运行环境。可以在[这篇文章](../documentation/how-pluto-works.zh-CN.md)中了解详细的工作流程。

保障用户开发体验的关键在于编译时执行的代码不能与用户代码直接关联，否则就需要开发者在开发时指定哪些代码是编译时执行的，哪些代码是运行时执行的。

而这个思路的关键点就在于：编译时执行的代码是根据推导出的参考架构生成而来，不需要在编译时执行用户代码。这也是与其他 Infrastructure from Code 技术的关键区别。

## Pluto ♇

Pluto 根据这个思路首先在 TypeScript 上进行尝试，让 TypeScript 成为面向云应用开发的一门新语言，就像 Pluto 从行星被重新分类为矮行星。虽然目前仍处于 PoC 阶段，但是可以给大家看看我们在 Demo 中实现的效果。

[https://github.com/pluto-lang/pluto/assets/20160766/add7f29c-a8f4-406a-a1b5-75495882c809](https://github.com/pluto-lang/pluto/assets/20160766/add7f29c-a8f4-406a-a1b5-75495882c809)

Demo 中，我在一份代码文件中，定义 3 个变量，KVStore、Queue、Router 各一个，同时定义了两个路由处理函数和一个消息订阅处理函数。在执行 `pluto deploy` 后，所有的基础设施资源和计算模块都被有序地部署到 AWS 云上。

然后，我新建了一个 Stack，指定运行时是 Kubenetes，不需要修改代码，我又将这个应用程序发布到了 Kubernetes 上。你觉得这种开发体验如何？

这里有更多的示例应用：

- [基于 OpenAI API 快速构建属于你自己的聊天机器人](https://github.com/pluto-lang/pluto/tree/main/examples/chat-bot)
- [每天给 Slack 频道发送一则计算机笑话](https://github.com/pluto-lang/pluto/tree/main/examples/daily-joke-slack)

---

**Pluto 目前仍处于 PoC 阶段，尚未准备好投入生产使用。如果你对“语言翻新”这个想法或者“Pluto”这款产品有任何想法，或者想参与开发，我们都十分欢迎，欢迎加入我们的 [Slack](https://join.slack.com/t/plutolang/shared_invite/zt-25gztklfn-xOJ~Xvl4EjKJp1Zn1NNpiw) 和 [GitHub](https://github.com/pluto-lang/pluto)，或者 钉钉交流群: 40015003990。**

## 参考

- [Pluto 工作原理](../documentation/how-pluto-works.zh-CN.md)
- [Pluto 解决什么问题](../documentation/what-problems-pluto-aims-to-address.zh-CN.md)
- [Pluto 和其他技术有什么不同](../documentation/whats-different.zh-CN.md)
