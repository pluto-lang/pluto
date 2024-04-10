# Differences between Pluto and other Products

## Differences from BaaS-type Products

Typical products: Supabase, Appwrite.

In the BaaS field, products that focus on this area typically provide self-managed databases, file storage, and other components. Users can create instances of these components in the backend and provide corresponding client SDKs to access these instances. Additionally, these products may also offer backend data visualization capabilities.

If you are not concerned about vendor lock-in and do not have concerns about service deployment, BaaS products can provide a good development experience. You can easily create instances of components like databases and only need to focus on calling these components in your code.

In comparison, Pluto helps developers create their own infrastructure environment within their own accounts on the target cloud platform. At the same time, Pluto provides the same development experience as BaaS products.

## Differences from PaaS-type Products

Typical products: Fly.io, render, Heroku, [LeptonAI](https://lepton.ai).

Compared to PaaS products like Fly.io, render, Heroku, and LeptonAI, Pluto does not focus on application hosting. Instead, it generates fine-grained computing modules through compilation and deduces the application's resource needs on infrastructure platform from the code. Then it integrates the rich atomic capabilities already provided by cloud platforms, such as FaaS, object storage, KV database, etc., allowing applications to be deployed to the cloud platform without the need for users to write additional configuration code.

LeptonAI is an AI infrastructure platform that allows developers to define AI applications in a Python Class, known as Photon. By default, LeptonAI provides attributes such as `requirement_dependency`, `system_dependency`, `image` in Photon, enabling developers to customize model images, configure basic dependencies, and more. Additionally, LeptonAI allows developers to manipulate the Transformer Pipeline within methods, making it relatively friendly for developers with AI model development experience who need fine-grained control over models. Furthermore, LeptonAI is developing capabilities like message queues, KV databases, object storage, etc., and developers can create these resource instances on the console.

In contrast, Pluto does not participate in the construction of infrastructure platforms but serves as a development tool, offering the rich atomic capabilities provided by the existing infrastructure in a more user-friendly way to the programmers. Existing cloud platforms like AWS, Alibaba Cloud, and K8s already offer fundamental services such as GPU instances, message queues, object storage, etc. However, the lack of an integrated development interface for developers makes these capabilities hard to use. Pluto provides these capabilities through a unified programming interface to developers, then it deduces the application's infrastructure resource needs from the application code, thereby automatically creating and deploying resource instances on the cloud platform, simplifying the resource creation and application deployment processes. In the programming interface, Pluto tries not to limit user programming habits, offering an experience similar to developing web applications. It allows defining resources by creating objects and configuring basic dependency environments through function parameters, reducing the presence of hardcoded elements. Pluto will also further relax programming constraints, offering a development experience akin to developing local monolithic applications.

## Differences from Scaffolding Tools

Typical products: Serverless Framework, Serverless Devs.

Compared to scaffolding tools like Serverless Framework and Serverless Devs, Pluto does not provide application programming frameworks specific to cloud vendors or specific frameworks. Instead, it provides a consistent programming interface for users, utilizing language technology to generate compute modules that are compatible with cloud vendors. Pluto also supports migration between cloud platforms without modifying code.

## Differences from IfC-type Products

### IfC-type Products based on pure annotation

Typical product: Klotho.

Compared to Klotho and other pure annotation-based Infra from Code (IfC) products, Pluto directly deduces resource dependencies from user code, providing a more consistent development experience. Additionally, the dependency mechanism of the programming language brings higher horizontal scalability.

### IfC Products based on dynamic program analysis

Typical products: Shuttle, Nitric, [Winglang](https://www.winglang.io).

IfC products based on dynamic program analysis fall into two categories: EDSL and DSL:

1. Products like Shuttle, Nitric, and the TypeScript versions of Winglang fall into the EDSL category. These products usually provide an SDK for a common programming language. By using this SDK together with the provided CLI, the product can deduce the application's infrastructure resource requirements from user code.
2. The wing language version of Winglang falls into the DSL category. This product introduces cloud concepts to developers through language keywords (preflight, inflight), while still exposing cloud capabilities to developers through a set of wing language SDKs related to the cloud. Winglang eventually compiles wing code into js code, adopting the same approach as EDSL to deduce application resource requirements on infrastructure.

IfC products based on dynamic analysis need to execute user code at compile time to deduce the application's requirements on infrastructure resources. This necessitates that developers during programming must be aware of and pay attention to the differences between compile time and runtime. They need to place code according to its expected execution timing to avoid executing runtime code at compile time or compile-time code at runtime.

Pluto offers EDSL solutions for various programming languages, currently supporting TypeScript and Python. However, Pluto uses a static program analysis approach, employing class hierarchy analysis, data flow analysis, and other methods to directly deduce the application's resource needs from application code. It then interacts with cloud platforms based on these resource needs, automatically completing the creation and configuration of infrastructure. This method does not require executing user code at compile time, so developers do not need to be concerned about the timing of code execution, lowering the cognitive burden. Additionally, compared to DSL, the EDSL approach allows for a more convenient enjoyment of the existing ecosystem's benefits.
