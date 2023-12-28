# Has the Cloud Truly Evolved into Infrastructure?

## Is cloud considered as infrastructure 🤔️

> Infrastructure is the set of facilities and systems that serve a country, city, or other area, and encompasses the services and facilities necessary for its economy, households and firms to function. —— Wikipedia

In a conceptual sense, the cloud can be considered as infrastructure. However, let's take a moment to think about it: when using an electric rice cooker, do you really care whether the electricity powering it comes from hydroelectric or thermal power sources? Similarly, when developing applications, do you find yourself needing to consider deploying them on AWS or Kubernetes? The truth is, the cloud is not as seamless and convenient as electricity. From a practical standpoint, it has not yet fully transformed into a comprehensive infrastructure. One possible missing piece could be an efficient method of accessing it.

## How cloud is utilized now ☁️

The cloud provides a broad range of capabilities, such as load balancing, serverless computing, and object storage. But how do you actually leverage these capabilities? Let me guess: you start by logging into the AWS console, navigating through countless resources to find DynamoDB, and then configuring a table in its settings. Next, you move to the Lambda page and create two functions, constantly referring to the DynamoDB SDK documentation to implement your brilliant ideas. Oh, wait! What was I doing just now? What did I set as the key for the table? Why is my data not being written successfully? And what on earth are IAM and ARN? Trying to grasp all this information is making my head spin 😵. Seriously, all I wanted was to develop a simple program 😤. After numerous deployments and tests, you finally go to the ApiGateway configuration page and create two routes and one deployment before publishing it. At long last, you've completed the development of an entire cloud application.

The entire process feels like participating in a 3-kilometer obstacle race when all you wanted was to develop a cloud application. You might have mentioned that you are familiar with Terraform or Pulumi, but even with those tools, you still need to learn various cloud capabilities and understand how to use Infrastructure-as-Code (IaC) tools like them, right? This is undoubtedly not an ideal development experience.

## Programming language is the key 🔑

How can we truly focus on building innovative applications? Reflecting on the history of computing, programming languages have always been the gateway to unlocking the vast world of computers. Programmers interact with the realm of computing through programming languages, gradually reducing the cognitive burden over time. From binary code to assembly language, from C to Python, the complexities of CPU architecture and instruction sets fade away as everything becomes more refined.

However, with the advent of cloud-native development, it feels like we are going back to square one in terms of application development. Could it be time to create yet another programming language? "What?! Another programming language? I do want to simplify my cloud experience, but I don't want to abandon all those convenient libraries!"

The ideal solution lies in striking a balance: **harnessing the power of programming languages to lower barriers for developers in the cloud, while still preserving existing language ecosystems and ensuring an exceptional developer experience**. And so, an idea was born 💡: let's transform an existing programming language into a new one. This entails retaining the syntax and ecosystem of a familiar language but recompiling it specifically for cloud-native development, making it a key player in the world of cloud development.

Introducing [Plutolang](https://github.com/pluto-lang/pluto), the embodiment of this innovative approach. We firmly believe that a product should **never impose a specific way of writing applications on developers. Instead, it should seamlessly integrate into their workflow and simplify their lives**. What developers truly desire are straightforward solutions that enhance their productivity and overall quality of life!

## Programming language renovation 🤸‍♀️

In the current programming landscape, we have a vast array of programming languages, most of which are designed to operate within a single-machine environment. But how can we "upgrade" these languages to enable natural distributed computing in the cloud? Our initial explorations have begun with the TypeScript language.

Let's start by considering how we typically develop applications for a single-machine environment. If we need to store key-value pairs for future use, we simply create a Map object. We can define multiple route handling functions for a web server in a single code file. These operations are simple and convenient, and our aim is to preserve this development experience.

To achieve this, we begin by focusing on the most commonly used extension method: dependency libraries. Users may have previously relied on 'express' as their dependency library, but now they can smoothly transition to using '@plutolang/pluto' with minimal disruption:

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

Developers can continue defining variables required for their applications and write multiple route handling functions in a single file as they normally would. Upon compilation, variables like kvstore and router will transform into cloud components (such as DynamoDB and ApiGateway), while the defined route handling functions will become Lambda functions in the cloud. This seamless transition allows developers to naturally leverage features such as pay-as-you-go billing and rapid scaling.

![](http://cdn.zhengsj.cn/ob-1698301951197.png)

The main idea behind this is to deduce the cloud resources that an application depends on from the user code, as well as the dependencies between resources. This builds a cloud resource topology, which serves as an architecture reference for the cloud environment. By further splitting and rewriting the user code, multiple computing modules can be exported that depend on this architecture reference. With this architecture reference as a basis, we are able to generate infrastructure code that is **not directly related to the user code**, but includes definitions of resources and deployment of computing modules. Finally, executing this infrastructure code creates and deploys a runtime environment for running applications in the cloud. You can learn more about this workflow in [this article](../documentation/how-pluto-works.en.md).

The key to ensuring an exceptional development experience for users lies in the separation between compile-time executed code and user code. Developers should not need to specify during development which parts of their code are meant for compile-time execution versus runtime execution.

And this is where our approach shines: the compile-time executed code is generated based on deduced architecture references and does not require the execution of user code at compile time. This sets it apart from other Infrastructure-from-Code technologies.

## Pluto ♇

Pluto initially experimented with TypeScript, aiming to transform it into a new language for cloud application development.

Pluto initially embarked on its journey by experimenting with TypeScript, much like how Pluto the dwarf planet was reclassified from a planet. The idea was to transform TypeScript into a new language for cloud application development. While still in the proof-of-concept stage, we can demonstrate the effects we have achieved through our demo.

[https://github.com/pluto-lang/pluto/assets/20160766/add7f29c-a8f4-406a-a1b5-75495882c809](https://github.com/pluto-lang/pluto/assets/20160766/add7f29c-a8f4-406a-a1b5-75495882c809)

In the demo, I defined three variables - KVStore, Queue, and Router - in a single code file. I also defined two route handling functions and one topic subscription handling function. By executing `pluto deploy`, all infrastructure resources and computing modules are efficiently deployed on the AWS cloud.

Furthermore, I created a new Stack, specifying Kubernetes as the runtime environment. Without modifying any code, I seamlessly deployed this application onto Kubernetes. What do you think of this development experience?

Here are a few more example applications:

- [Build your own chatbot quickly using OpenAI API.](https://github.com/pluto-lang/pluto/tree/main/examples/chat-bot)
- [Send a computer joke to your Slack channel every day.](https://github.com/pluto-lang/pluto/tree/main/examples/daily-joke-slack)

---

**Please note that Pluto is currently in the PoC stage and is not yet ready for production use. If you have any ideas regarding the concept of "language renovation" or thoughts on the Pluto product, or if you would like to contribute to its development, we warmly invite you to join our Slack community and GitHub repository. Feel free to join us at [Slack](https://join.slack.com/t/plutolang/shared_invite/zt-25gztklfn-xOJ~Xvl4EjKJp1Zn1NNpiw) and [GitHub](https://github.com/pluto-lang/pluto).**

## References

- [How Pluto Works](../documentation/how-pluto-works.en.md)
- [What Problem does Pluto Solve?](../documentation/what-problems-pluto-aims-to-address.en.md)
- [Differences between Pluto and other Products](../documentation/whats-different.en.md)
