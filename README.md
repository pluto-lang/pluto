<p align="center"> 
    <img src="assets/pluto-logo.png" width="250">
    <br/>
    <br/>
   <a href="./README.md"> English </a> 
   | 
   <a href="./README_zh.md"> 简体中文 </a>
</p>

<p align="center">
  <a href="https://join.slack.com/t/plutolang/shared_invite/zt-25gztklfn-xOJ~Xvl4EjKJp1Zn1NNpiw"><img alt="slack" src="https://img.shields.io/badge/Join%20Our%20Community-Slack-blue?style=flat-square"></a>
  <a href="https://github.com/pluto-lang/pluto/blob/main/LICENSE"><img alt="license" src="https://img.shields.io/github/license/pluto-lang/pluto?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/@plutolang/cli"><img alt="npm version" src="https://img.shields.io/npm/v/%40plutolang%2Fcli?style=flat-square&logo=npm"></a>
  <a href="https://www.npmjs.com/package/@plutolang/cli"><img alt="npm download" src="https://img.shields.io/npm/dm/%40plutolang/cli?style=flat-square"></a>
</p>

Pluto is a development tool dedicated to helping developers **build cloud and AI applications more conveniently**, resolving issues such as the challenging deployment of AI applications and open-source models.

Developers are able to write applications in familiar programming languages like **Python and TypeScript**, **directly defining and utilizing the cloud resources necessary for the application within their code base**, such as AWS SageMaker, DynamoDB, and more. Pluto automatically deduces the infrastructure resource needs of the app through **static program analysis** and proceeds to create these resources on the specified cloud platform, **simplifying the resources creation and application deployment process**.

**⚠️ Caution: Pluto is still in its early stages, please consider it for production environments with caution.**

## 🌟 Example

Let's develop a text generation application based on GPT2, where the user input is processed by the GPT2 model to generate and return text. Below is how the development process with Pluto looks:

<p align="center">
  <img src="./assets/readme-gpt2-process.png" alt="GPT2 Process" width="90%">
</p>

AWS SageMaker is utilized as the model deployment platform, and AWS Api Gateway and Lambda support the application's HTTP services. The deployed application architecture, as shown in the top right graphic ↗️, comprises two route handling functions: one to receive user input, invoke the SageMaker model, and return generated text, and another to provide the endpoint URL of the SageMaker model.

The top left graphic ↖️ captures a fragment of the application code, with the complete code accessible [here](https://github.com/pluto-lang/pluto/tree/main/examples/gpt2-hf-sagemaker). In the TypeScript code development process using Pluto, by creating a new SageMaker instance using `new SageMaker()`, you can directly interact with the SageMaker model using methods like `sagemaker.invoke()` and obtain the model endpoint URL using `sagemaker.endpointUrl()`. Establishing an Api Gateway requires only creating a new variable `router` with `new Router()`, and the function arguments within the methods of `router`, such as `router.get()`, `router.post()`, etc., will automatically be converted into Lambda functions. The same application could be implemented in Python as well.

Once the application code has been written, executing `pluto deploy` allows Pluto to deduce the application's infrastructure needs and **automatically provision around 30 cloud resources**, which includes instances such as SageMaker, Lambda, Api Gateway, along with setups like triggers, IAM roles, and policy permissions.

Finally, Pluto hands back the URL of the Api Gateway, providing direct access to use the application.

**Interested in exploring more examples?**

- TypeScript applications:
  - [Conversation chatbot based on LangChain, Llama2, DynamoDB, SageMaker](https://github.com/pluto-lang/pluto/tree/main/examples/langchain-llama2-chatbot-sagemaker)
  - [Chatbot leveraging the OpenAI API](https://github.com/pluto-lang/pluto/tree/main/examples/chat-bot)
  - [Daily Joke Slack Bot](https://github.com/pluto-lang/pluto/tree/main/examples/daily-joke-slack)
- Python applications:
  - [Deploy a FastAPI app to AWS](https://github.com/pluto-lang/pluto/tree/main/examples/fastapi)
  - [Deploy a LangServe app to AWS](https://github.com/pluto-lang/pluto/tree/main/examples/deploy-langserve-to-aws)
  - [Conversational chatbot based on LangChain, Llama2, DynamoDB, SageMaker](https://github.com/pluto-lang/pluto/tree/main/examples/langchain-llama2-chatbot-sagemaker-python)

## 🚀 Quick Start

<b style="color: green;">Online Experience</b>: [CodeSandbox](https://codesandbox.io) provides an online development environment. We have constructed Pluto templates in both [Python](https://codesandbox.io/p/devbox/github/pluto-lang/codesandbox/tree/main/python?file=/README.md) and [TypeScript](https://codesandbox.io/p/devbox/github/pluto-lang/codesandbox/tree/main/typescript?file=/README.md) languages on this platform, **allowing direct experience in the browser**. After opening the project template, creating your own project is as easy as clicking the Fork button in the top right corner. The environment is pre-equipped with AWS CLI, Pulumi, and Pluto's basic dependencies, adhering to the README for operations.

<b style="color: green;">Container Experience</b>: We offer a container image `plutolang/pluto:latest` for application development, which contains essential dependencies like AWS CLI, Pulumi, and Pluto, along with Node.js 20.x and Python 3.10 environments pre-configured. If you are interested in developing only TypeScript applications, you can use the `plutolang/pluto:latest-typescript` image. You can partake in Pluto development within a container using the following command:

```shell
docker run -it --name pluto-app plutolang/pluto:latest bash
```

<b style="color: green;">Local Experience</b>: For local use, please follow these steps for setup:

### 0. Install Pulumi

Pluto operates within a Node.js environment and uses Pulumi for interaction with cloud platforms (AWS or K8s). You can refer to the [Pulumi installation guide](https://www.pulumi.com/docs/install/).

### 1. Install Pluto

```shell
npm install -g @plutolang/cli
```

### 2. Deploy your application with Pluto

```shell
pluto new        # Interactively create a new project, allowing selection of TypeScript or Python
cd <project_dir> # Enter your project directory
npm install      # Download dependencies

# If it's a Python project, in addition to npm install, Python dependencies must also be installed.
pip install -r requirements.txt

pluto deploy     # Deploy with one click!
```

⚠️ **Note:**

- If the target platform is AWS, Pluto attempts to read your AWS configuration file to acquire the default AWS Region, or alternatively, tries to fetch it from the environment variable `AWS_REGION`. **Deployment will fail if neither is set.**
- If the target platform is Kubernetes, Knative must firstly be installed within K8s and the scale-to-zero feature should be deactivated (as Pluto doesn't yet support Ingress forwarding to Knative serving). You can configure the required Kubernetes environment following [this document](./docs/dev_guide/setup-k8s-dev-env.en.md).

For detailed steps, refer to the [Getting Started Guide](./docs/documentation/getting-started.en.md).

> Currently, Pluto only supports single-file configurations. Inside each handler function, access is provided to literal constants and plain functions outside of the handler's scope; however, Python allows direct access to classes, interfaces, etc., outside of the scope, whereas TypeScript requires encapsulating these within functions for access.

## 🤯 Pain Points

[Here you can find out why Pluto was created](./docs/documentation/what-problems-pluto-aims-to-address.en.md). To put it simply, we aim to address several pain points you might often encounter:

- **High learning curve**: Developing a cloud application requires mastery of both the business and infrastructure skills, and it often demands significant efforts in testing and debugging. Thus, developers spend a considerable amount of energy on aspects beyond writing the core business logic.
- **High cognitive load**: With cloud service providers offering hundreds of capabilities and Kubernetes offering nearly limitless possibilities, average developers often lack a deep understanding of cloud infrastructure, making it challenging to choose the proper architecture for their particular needs.
- **Poor programming experience**: Developers must maintain separate codebases for infrastructure and business logic or intertwine infrastructure configuration within the business logic, leading to a sub-optimal programming experience that falls short of the simplicity of creating a local standalone program.
- **Vendor lock-in**: Coding for a specific cloud provider can lead to poor flexibility in the resulting code. When it becomes necessary to migrate to another cloud platform due to cost or other factors, adapting the existing code to the new environment can require substantial changes.

## 💡 Features

- **No learning curve**: The programming interface is fully compatible with TypeScript, Python, and supports the majority of dependency libraries such as LangChain, LangServe, FastAPI, etc.
- **Focus on pure business logic**: Developers only need to write the business logic. Pluto, via static analysis, automatically deduces the infrastructure requirements of the application.
- **One-click cloud deployment**: The CLI provides basic capabilities such as compilation and deployment. Beyond coding and basic configuration, everything else is handled automatically by Pluto.
- **Support for various runtime environments**: With a unified abstraction based on the SDK, it allows developers to migrate between different runtime environments without altering the source code.

## 🔧 How Does Pluto Work?

<p align="center">
  <img src="./assets/pluto-arch.jpg" alt="Pluto Architecture" width="750">
</p>

Overall, the Pluto deployment process comprises three stages—deduction, generation, and deployment:

1. **Deduction Phase**: The deducer analyzes the application code to derive the required cloud resources and their interdependencies, resulting in an architecture reference. It also splits user business code into business modules, which, along with the dependent SDK, form the business bundle.
2. **Generation Phase**: The generator creates IaC code that is independent of user code, guided by the architecture reference.
3. **Deployment Phase**: Depending on the IaC code type, Pluto invokes the corresponding adapter, which, in turn, works with the respective IaC engine to execute the IaC code, managing infrastructure configuration and application deployment.

Components such as the deducer, generator, and adapter are extendable, which allows support for a broader range of programming languages and platform integration methods. Currently, Pluto provides deducers for [Python](https://github.com/pluto-lang/pluto/tree/main/components/deducers/python-pyright) and [TypeScript](https://github.com/pluto-lang/pluto/tree/main/components/deducers/static), and a [generator](https://github.com/pluto-lang/pluto/tree/main/components/generators/static) and [adapter](https://github.com/pluto-lang/pluto/tree/main/components/adapters/pulumi) for Pulumi. Learn more about Pluto's processes in detail in [this document](./docs/documentation/how-pluto-works.en.md).

## 🤔️ Differences from Other Projects?

Pluto distinguishes itself from other offerings by **leveraging static program analysis techniques to infer resource dependencies directly from application code** and generate infrastructure code that remains separate from business logic. This approach **ensures infrastructure configuration does not intrude into business logic**, providing developers with a **development experience free from infrastructure concerns**.

- Compared to **BaaS** (Backend as a Service) products like Supabase or Appwrite, Pluto assists developers in creating the necessary infrastructure environment within their own cloud account, rather than offering managed components.
- Differing from **PaaS** (Platform as a Service) offerings like Fly.io, Render, Heroku, or LeptonAI, Pluto does not handle application hosting. Instead, it compiles application into finely-grained compute modules, and integrates with rich cloud platform capabilities like FaaS, GPU instances, and message queues, enabling deployment to cloud platforms without requiring developers to write extra configurations.
- In contrast to **scaffolding tools** such as the Serverless Framework or Serverless Devs, Pluto does not impose an application programming framework specific to particular cloud providers or frameworks, but instead offers a uniform programming interface.
- Unlike **IfC (Infrastructure from Code) products based purely on annotations** like Klotho, Pluto infers resource dependencies directly from user code, eliminating the need for extra annotations.
- Different from other **IfC products that rely on dynamic analysis**, like Shuttle, Nitric, and Winglang, Pluto employs static program analysis to identify application resource dependencies, generating independent infrastructure code without having to execute user code.

You can learn more about the differences with other projects in [this document](./docs/documentation/whats-different.en.md).

## 👏 Contributing

Pluto is still in its infancy, and we warmly welcome contributions from those who are interested. Any suggestions or ideas about the issues Pluto aims to solve, the features it offers, or its code implementation can be shared and contributed to the community. Please refer to our [project contribution guide](./docs/dev_guide/dev_guide.en.md) for more information.

## 🐎 Roadmap

- Complete implementation of the resource static deduction process
  - 🚧 Resource type checking
  - ❌ Conversion of local variables into cloud resources
- SDK development
  - 🚧 Client SDK development
  - 🚧 Infra SDK development
  - ❌ Support for additional resources and more platforms
- Engine extension support
  - 🚧 Pulumi
  - ❌ Terraform
- 🚧 Local simulation and testing functionality

Please see the [Issue list](https://github.com/pluto-lang/pluto/issues) for further details.

## 📊 Capability Matrix

✅: Indicates that all user-visible interfaces are available  
🚧: Indicates that some of the user-visible interfaces are available  
❌: Indicates not yet supported

### TypeScript

| Resource Type | AWS | Kubernetes | Alibaba Cloud | Simulation |
| :-----------: | :-: | :--------: | :-----------: | :--------: |
|    Router     | ✅  |     🚧     |      🚧       |     🚧     |
|     Queue     | ✅  |     ✅     |      ❌       |     ✅     |
|    KVStore    | ✅  |     ✅     |      ❌       |     ✅     |
|   Function    | ✅  |     ✅     |      ✅       |     ✅     |
|   Schedule    | ✅  |     ✅     |      ❌       |     ❌     |
|    Tester     | ✅  |     ❌     |      ❌       |     ✅     |
|   SageMaker   | ✅  |     ❌     |      ❌       |     ❌     |

### Python

| Resource Type | AWS | Kubernetes | Alibaba Cloud | Simulation |
| :-----------: | :-: | :--------: | :-----------: | :--------: |
|    Router     | ✅  |     ❌     |      ❌       |     ❌     |
|     Queue     | ✅  |     ❌     |      ❌       |     ❌     |
|    KVStore    | ✅  |     ❌     |      ❌       |     ❌     |
|   Function    | ✅  |     ❌     |      ❌       |     ❌     |
|   Schedule    | ✅  |     ❌     |      ❌       |     ❌     |
|    Tester     | ❌  |     ❌     |      ❌       |     ❌     |
|   SageMaker   | ✅  |     ❌     |      ❌       |     ❌     |

## 💬 Community

Join our [Slack](https://join.slack.com/t/plutolang/shared_invite/zt-25gztklfn-xOJ~Xvl4EjKJp1Zn1NNpiw) community to communicate and contribute ideas.
