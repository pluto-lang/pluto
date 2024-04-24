---
title: 部署 LangServe 应用到 AWS
description: 使用 Pluto 部署 LangServe 应用到 AWS 上，通过 Api Gateway 暴露 LangServe 应用，支持 RemoteRunnable 调用，支持 Playground。
deployUrl: https://codesandbox.io/p/devbox/deploy-langserve-application-to-aws-csj8w
tags: ["AWS", "LangServe", "Python"]
---

# 部署 LangServe 应用到 AWS

**这篇指南将介绍如何通过 Pluto 将 LangServe 应用一键部署到 AWS 上，全程无需登陆 AWS 控制台，只需准备好 AWS 访问凭证即可。**

[LangServe](https://github.com/langchain-ai/langserve) 是 LangChain 的一个子项目，可以帮助开发者通过 REST API 部署 LangChain 的 Runnable 和 Chain。同时，它还提供了一个用于调用部署在服务器上的 Runnable 的客户端类，包括 Python、TypeScript 等多个版本，以及默认提供 Playground 供部署后直接在线试用。

可以从[这里](./)获取本示例的全部代码，[这个链接](https://codesandbox.io/p/devbox/deploy-langserve-application-to-aws-csj8wj)提供了本示例应用的在线 IDE，点击右上角 Fork 按钮即可创建你自己的开发环境，然后你就可以直接在浏览器中修改代码并部署到 AWS 上了。

**⚠️注意：**

1. 由于 Pluto 目前仅支持单文件，因此 LangServe 应用的代码需要放在一个文件中。
2. 受限于 Pluto 现有的打包方式，目前还不支持 LangChain 的 [Template 生态](https://github.com/langchain-ai/langchain/tree/master/templates)。_快速支持中_

## 环境准备

如果你还没有配置 Pluto 开发环境，请参考[快速开始](../../docs/documentation/getting-started.zh-CN.mdx)中的本地开发进行配置，或使用 Pluto 提供的在线 IDE 或容器体验。

- 在线 IDE：
  - [Python 模板应用 | CodeSandbox](https://codesandbox.io/p/devbox/github/pluto-lang/codesandbox/tree/main/python?file=/README_zh.md)
- 容器：
  - `docker run -it --privileged --name pluto-app plutolang/pluto:latest bash`

## 开发 LangServe 应用

这里我们介绍两种不同的开发 LangServe 应用的方式：一种是 [langserve 教程](https://github.com/langchain-ai/langserve)中提及的开发方式，使用 `langchain app new` 命令创建一个新的 LangChain 应用；另一种是使用 `pluto new` 命令创建一个新的 Pluto 应用。

### 方式 1： langchain app new

#### 安装 LangChain CLI

```sh
pip install langchain-cli
```

#### 创建 LangServe 应用

使用 `langchain app new` 命令创建一个新的 LangChain 应用，这个命令会在当前目录下创建一个新的目录，目录名为你指定的应用名：

```sh
langchain app new --non-interactive my-app
cd my-app
```

注意：`langchain app new` 命令依赖 `git`，请确保你的环境中已经安装了 `git`。如果你在使用 Pluto 提供的容器环境，请先执行这条命令 `apt-get update && apt-get install -y git` 安装 `git`：

#### 编写 LangServe 应用

你可以根据你的需求在 `app/server.py` 文件开发基于 LangChain 的 AI 应用，最后你应该会开发出 1 个或多个 LangChain 的 Agent、Chain 等 Runnable 实例。这些实例可以通过 LangServe 提供的 `add_routes` 方法添加到 FastAPI 中，然后以 HTTP 服务的形式提供给用户。

我们以 [LangServe 首页的示例应用](https://github.com/langchain-ai/langserve?tab=readme-ov-file#sample-application)为例，该示例使用 `add_routes` 方法将多个 LangChain 的 Runnable 实例添加到 FastAPI 中：

<details><summary>🔘 点击展开查看示例应用代码</summary>

_由于 Pluto 还未支持传递环境变量，因此我们需要在代码中配置 OpenAI 和 Anthropic 的 API Key。_

```python
from fastapi import FastAPI
from langchain.prompts import ChatPromptTemplate
# from langchain.chat_models import ChatAnthropic, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain.pydantic_v1 import SecretStr

OPENAI_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")
ANTHROPIC_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")

app = FastAPI(
    title="LangChain Server",
    version="1.0",
    description="A simple api server using Langchain's Runnable interfaces",
)

add_routes(
    app,
    ChatOpenAI(api_key=OPENAI_API_KEY),
    path="/openai",
)

add_routes(
    app,
    ChatAnthropic(api_key=ANTHROPIC_API_KEY),
    path="/anthropic",
)

model = ChatAnthropic(api_key=ANTHROPIC_API_KEY)
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")
add_routes(
    app,
    prompt | model,
    path="/joke",
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
```

</details>

#### 修改代码适配 Pluto

接下来，我们需要将 LangServe 应用适配为 Pluto 应用，以便 Pluto 可以将其部署到 AWS 上。适配过程也非常简单，只需两步

1. 首先，需要将与 FastAPI app 相关的代码放到一个函数中，并使这个函数返回 FastAPI app 实例，这里假设这个函数名为 `return_fastapi_app`。
2. 然后，将代码中的 `if __name__ == "__main__":` 代码块整体替换为以下 4 条语句，你可以修改 `router_name` 为你的喜欢的名字，这个名字与最终在 AWS 创建的 Api Gateway 实例的名称相关。

```python
from mangum import Mangum
from pluto_client import Router

router = Router("router_name")
router.all("/*", lambda *args, **kwargs: Mangum(return_fastapi_app(), api_gateway_base_path="/dev")(*args, **kwargs), raw=True)
```

最终的代码如下：

<span id="modified-code"></span>

```python
from fastapi import FastAPI
from langchain.prompts import ChatPromptTemplate
# from langchain.chat_models import ChatAnthropic, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain.pydantic_v1 import SecretStr

from mangum import Mangum
from pluto_client import Router

OPENAI_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")
ANTHROPIC_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")

model = ChatAnthropic(api_key=ANTHROPIC_API_KEY)
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")

def return_fastapi_app():
    # The langserve depends on this, but it may not come pre-installed.
    # So, we write it here to ensure it is installed.
    import sse_starlette

    app = FastAPI(
        title="LangChain Server",
        version="1.0",
        description="A simple api server using Langchain's Runnable interfaces",
    )

    add_routes(
        app,
        ChatOpenAI(api_key=OPENAI_API_KEY),
        path="/openai",
    )

    add_routes(
        app,
        ChatAnthropic(api_key=ANTHROPIC_API_KEY),
        path="/anthropic",
    )

    add_routes(
        app,
        prompt | model,
        path="/joke",
    )

    return app

router = Router("router_name")
router.all(
    "/*",
    lambda *args, **kwargs: Mangum(return_fastapi_app(), api_gateway_base_path="/dev")(*args, **kwargs),
    raw=True,
)
```

#### 部署到 AWS

在正式部署之前，我们需要将该项目初始化为 Pluto 项目，这样 Pluto 才能识别并部署该项目。在项目根目录下运行以下命令，Pluto 会交互式的引导你初始化项目，编程语言请选择 Python：

```sh
pluto init
```

初始化完成后，我们需要安装一些必需的依赖，执行以下两条命令：

```sh
npm install

pip install poetry
# Python 版本不匹配时，请修改 pyproject.toml 中的 python 版本号
poetry add pluto-client mangum langchain-openai langchain_anthropic
```

最后，我们执行以下命令就可以将 LangServe 应用部署到 AWS 上：

```bash
poetry shell
pluto deploy app/server.py
```

**注意：如果你的研发环境为 Arm64 架构**，请在环境中安装并启动 `docker`。如果你使用的是 Pluto 提供的容器环境，环境中已经安装了 `docker`，但需要在启动时配置 `--privileged` 参数，然后在容器中手动启动 `docker` 服务，启动命令为:

```sh
dockerd > /dev/null 2>&1 &
```

这条命令会把你的 LangServe 应用程序作为无服务器应用程序部署到 AWS 上，将创建一个 Api Gateway 实例和一个 Lambda 函数实例来处理请求。同时会在终端打印出 AWS 的 Api Gateway 的 URL，你可以通过访问这个 URL 来访问部署的应用程序。

### 方式 2： pluto new

#### 创建 Pluto 应用

使用 `pluto new` 命令创建一个新的 Pluto 应用，这个命令会交互式地创建一个新的 Pluto 应用，并且会在当前目录下创建一个新的目录，目录名为你指定的应用名，编程语言请选择 Python：

```sh
pluto new
```

创建完成后，进入到创建的应用目录，并安装必要的依赖：

```sh
cd <project name>
npm install
pip install -r requirements.txt
```

#### 编写 LangServe 应用

你可以根据你的需求在 `app/main.py` 文件开发基于 LangChain 的 AI 应用，最后你应该会开发出 1 个或多个 LangChain 的 Agent、Chain 等 Runnable 实例。这些实例可以通过 LangServe 提供的 `add_routes` 方法添加到 FastAPI 中，然后以 HTTP 服务的形式提供给用户。

但这里，我们需要将与 FastAPI app 相关的代码放到一个函数中，并使这个函数返回 FastAPI app 实例，最后将这个函数封装在 `Router` 的 `all` 方法中，以便 Pluto 可以将其部署到 AWS 上。

以 LangServe 首页的示例应用为例，最终的代码与上一种[适配后的代码](#modified-code)相同。

#### 部署到 AWS

确保所有依赖都已安装完成后，执行下面这条命令就可以将 LangServe 应用部署到 AWS 上：

```sh
pluto deploy
```

**注意：如果你的研发环境为 Arm 架构**，请在环境中安装并启动 `docker`。如果你使用的是 Pluto 提供的容器环境，环境中已经安装了 `docker`，但需要在启动时配置 `--privileged` 参数，然后在容器中手动启动 `docker` 服务，启动命令为:

```sh
dockerd > /dev/null 2>&1 &
```

`pluto deploy` 会把你的 LangServe 应用程序作为无服务器应用程序部署到 AWS 上，将创建一个 Api Gateway 实例和一个 Lambda 函数实例来处理请求。同时会在终端打印出 AWS 的 Api Gateway 的 URL，你可以通过访问这个 URL 来访问部署的应用程序。

## 访问

部署完成后，你可以从终端看到 Pluto 输出的 URL，你可以通过这个 URL 访问你的 LangServe 应用程序。

**⚠️注意：**

- Pluto 尚未支持 Stream 访问，在使用 LangServe 的 `astream` 方法时结果仍是一次性返回的。
- 由于第一次加载 LangChain 依赖库可能会比较慢，所以第一次调用 LangServe 服务或者访问 Playground 时可能会比较慢，超过 30 秒后会自动超时。因此，如果你在访问时遇到超时问题，请再次尝试。
- 每个 AWS Lambda 函数的实例只能同时处理一个请求，而每个 LangChain 的 Lambda 实例的初始化时间接近 2 分钟，因此在高并发情况下可能会出现请求超时问题。

### 通过 RemoteRunnable 调用

还是以 [LangServe 首页示例应用提供的 Client](https://github.com/langchain-ai/langserve?tab=readme-ov-file#client) 为例，你只需要将 LangServe 示例中的本地 URL 替换为 Pluto 输出的 URL 即可。

我们没有使用 Anthropic 模型，因此只保留了 OpenAI 和 Joke 模型的调用，修改后的 Python 客户端代码如下，请将代码中的 `https://fcz1u130w3.execute-api.us-east-1.amazonaws.com/dev` 替换为 Pluto 输出的 URL：

<details><summary>🔘 点击展开查看 Python 客户端代码</summary>

```python
import asyncio

from langchain.schema import SystemMessage, HumanMessage
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableMap
from langserve import RemoteRunnable


openai = RemoteRunnable(
    "https://fcz1u130w3.execute-api.us-east-1.amazonaws.com/dev/openai/"
)
joke_chain = RemoteRunnable(
    "https://fcz1u130w3.execute-api.us-east-1.amazonaws.com/dev/joke/"
)


def sync_inoke():
    result = joke_chain.invoke({"topic": "parrots"})
    print(
        ">> The result of `joke_chain.invoke({'topic': 'parrots'})` is:\n",
        result.content,
        "\n",
    )


async def async_inoke():
    result = await joke_chain.ainvoke({"topic": "parrots"})
    print(
        ">> The result of `await joke_chain.ainvoke({'topic': 'parrots'})` is:\n",
        result.content,
        "\n",
    )

    prompt = [
        SystemMessage(content="Act like either a cat or a parrot."),
        HumanMessage(content="Hello!"),
    ]

    # Supports astream
    print(">> The result of `openai.astream(prompt)` is:")
    async for msg in openai.astream(prompt):
        print(msg.content, end=" | ", flush=True)
    print()


def custom_chain():
    prompt = ChatPromptTemplate.from_messages(
        [("system", "Tell me a long story about {topic}")]
    )

    # Can define custom chains
    chain = prompt | RunnableMap(
        {
            "openai": openai,
            "anthropic": openai,
        }
    )

    result = chain.batch([{"topic": "parrots"}, {"topic": "cats"}])
    print(
        ">> The result of `chain.batch([{'topic': 'parrots'}, {'topic': 'cats'}])` is:\n",
        result,
    )


async def main():
    sync_inoke()
    await async_inoke()
    custom_chain()


asyncio.run(main())
```

</details>

下面这幅图展示了执行 Python 客户端代码的结果：

<p align="center">
   <img src="./assets/pyclient.png" alt="Python Client Result" width="80%"/>
</p>

修改后的 TypeScript 客户端代码如下，请将代码中的 `<your-api-gateway-url>` 替换为 Pluto 输出的 URL：

```typescript
import { RemoteRunnable } from "@langchain/core/runnables/remote";

const chain = new RemoteRunnable({
  url: `<your-api-gateway-url>/joke/`,
});
const result = await chain.invoke({
  topic: "cats",
});
```

### 通过 curl 访问

同样，你也只需要将示例中的 `<your-api-gateway-url>` 替换为 Pluto 输出的 URL：

```sh
curl --location --request POST '<your-api-gateway-url>/joke/invoke' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "input": {
            "topic": "cats"
        }
    }'
```

下面这幅图展示了执行 curl 命令的结果：

<p align="center">
   <img src="./assets/curl.png" alt="Curl Result" width="60%"/>
</p>

### 通过浏览器访问 Playground

受限于 LangServe 目前的路由策略，我们无法在不修改代码的情况下直接通过浏览器访问 LangServe 的 Playground，在[这个 PR](https://github.com/langchain-ai/langserve/pull/580) 合并之后，就可以直接支持通过浏览器访问 LangServe 的 Playground 了。

现在，我们需要对每一个 `add_routes` 方法，再额外添加一个 `add_routes` 方法，并在 `path` 参数前添加 `/dev` 前缀，这样就可以在浏览器中访问 LangServe 的 Playground 了。下面是一个示例代码：

```python
add_routes(
    app,
    ChatOpenAI(api_key=OPENAI_API_KEY),
    path="/openai",
)

add_routes(
    app,
    ChatOpenAI(api_key=OPENAI_API_KEY),
    path="/dev/openai",
)
```

修改部署后，可以通过以下 URL 访问示例应用的 Playground，注意的是，访问路径中需要额外添加 `/dev`，即路径中包含两个 `/dev`。注意，URL 可能会被重定向，如果被修改了，请重新调整路径并再次访问。

- OpenAI: `<your-api-gateway-url>/dev/openai/playground`
- Anthropic: `<your-api-gateway-url>/dev/anthropic/playground`
- Joke: `<your-api-gateway-url>/dev/joke/playground`

下面两幅图分别展示了通过浏览器访问 OpenAI 和 Joke 的 Playground 的结果：

<p align="center">
   <img src="./assets/openai-playground.png" alt="OpenAI Playground" width="45%"/>
   <img src="./assets/joke-playground.png" alt="Joke Playground" width="45%"/>
</p>

## 清理

如果你希望将部署的 LangServe 应用程序从 AWS 上下线，只需要执行以下命令即可：

```sh
pluto destroy
```

## 总结

在本文中，我们详细探讨了如何使用 Pluto 将 LangServe 应用一键部署到 AWS 云平台。这种方式即使你不熟悉 AWS 的操作，也可以轻松地将 LangServe 应用部署到云端，实现远程调用和 Playground 的访问。

Pluto 还提供了自动创建 DynamoDB、SNS、SageMaker 等资源的能力，你只需要编写代码，`pluto deploy` 就会自动地在 AWS 上创建和配置这些资源，将云的计算、存储等能力更便捷地提供给你，帮助你更轻松地研发出功能强大的 AI 应用，实现你的 idea💡，你可以从[更多资源](#更多资源)中获取更多信息。

我们尽可能让本文的步骤简单易懂，即使你对 Pluto 或 AWS 不太熟悉，也可以轻松上手。如果你在阅读或实践时遇到问题，或者有新的想法与需求，请随时通过[提交 issue](https://github.com/pluto-lang/pluto/issues/new/choose) 或[加入 Pluto Slack 社区](https://join.slack.com/t/plutolang/shared_invite/zt-25gztklfn-xOJ~Xvl4EjKJp1Zn1NNpiw)寻求帮助。

## 更多资源

- [LangServe](https://github.com/langchain-ai/langserve)
- [LangChain](https://www.langchain.com/)
- [Pluto 文档](https://pluto-lang.vercel.app/zh-CN)
- [Pluto 示例应用](https://pluto-lang.vercel.app/zh-CN/cookbook/)
- [Pluto GitHub 仓库](https://github.com/pluto-lang/pluto)
- [Pluto Slack 社区](https://join.slack.com/t/plutolang/shared_invite/zt-25gztklfn-xOJ~Xvl4EjKJp1Zn1NNpiw)

---

## 极速体验版

将该脚本的 `OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_REGION` 等参数替换为你的真实值，然后将该脚本保存到你本地。

执行该脚本，将会自动创建一个 LangServe 示例应用，并将其部署到 AWS 上，最后输出部署的 URL，你可以参考上文中的 [访问](#访问) 部分来访问部署的应用。

执行结束后，会进入一个交互式命令行，方便你通过 `pluto destroy` 下线部署的应用。

```sh
OPENAI_API_KEY="<your-openai-api-key>"
AWS_ACCESS_KEY_ID="<your-aws-access-key-id>"
AWS_SECRET_ACCESS_KEY="<your-aws-secret-access-key>"
AWS_REGION="us-east-1"

# Prepare the modified code of LangServe application
MODIFIED_CODE=$(cat <<EOF
from fastapi import FastAPI
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain.pydantic_v1 import SecretStr

from mangum import Mangum
from pluto_client import Router

OPENAI_API_KEY = SecretStr("${OPENAI_API_KEY}")

model = ChatOpenAI(api_key=OPENAI_API_KEY)
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")

def return_fastapi_app():
    # The langserve depends on this, but it may not come pre-installed.
    # So, we write it here to ensure it is installed.
    import sse_starlette

    app = FastAPI(
      title="LangChain Server",
      version="1.0",
      description="A simple api server using Langchain's Runnable interfaces",
    )

    add_routes(
      app,
      ChatOpenAI(api_key=OPENAI_API_KEY),
      path="/openai",
    )

    add_routes(
      app,
      ChatOpenAI(api_key=OPENAI_API_KEY),
      path="/dev/openai",
    )

    add_routes(
      app,
      prompt | model,
      path="/joke",
    )

    add_routes(
      app,
      prompt | model,
      path="/dev/joke",
    )

    return app

router = Router("router_name")
router.all(
    "/*",
    lambda *args, **kwargs: Mangum(return_fastapi_app(), api_gateway_base_path="/dev")(*args, **kwargs),
    raw=True,
)
EOF
)

# Prepare the package.json file, used by the Pluto
PACKAGE_JSON=$(cat <<EOF
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "test:dev": "pluto test --sim",
    "test:prod": "pluto test",
    "deploy": "pluto deploy",
    "destroy": "pluto destroy"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5.2.2",
    "@plutolang/base": "latest",
    "@plutolang/pluto-infra": "latest",
    "@pulumi/pulumi": "^3.88.0"
  },
  "main": "dist/index.js"
}
EOF
)

# Prepare the Pluto configuration file
PLUTO_YML=$(cat <<EOF
current: aws
language: python
stacks:
  - configs: {}
    name: aws
    platformType: AWS
    provisionType: Pulumi
EOF
)

# Prepare the AWS credentials
AWS_CREDENTIALS=$(cat <<EOF
[default]
aws_access_key_id = ${AWS_ACCESS_KEY_ID}
aws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}
EOF
)

# Prepare the AWS configuration
AWS_CONFIG=$(cat <<EOF
[default]
region = ${AWS_REGION}
EOF
)

# Prepare the script to run inside the Docker container
cat <<EOF1 > script.sh
#!/bin/bash

apt update
apt install -y git

pip install langchain-cli poetry

langchain app new --non-interactive my-app
cd my-app

cat << EOF2 > app/server.py
${MODIFIED_CODE}
EOF2

cat << EOF3 > package.json
${PACKAGE_JSON}
EOF3

mkdir -p .pluto
cat << EOF4 > .pluto/pluto.yml
${PLUTO_YML}
EOF4

npm install
sed -i 's/\^3.11/\^3.10/' pyproject.toml
poetry add pluto-client mangum langchain-openai

mkdir -p ~/.aws
cat << EOF5 > ~/.aws/credentials
${AWS_CREDENTIALS}
EOF5
cat << EOF6 > ~/.aws/config
${AWS_CONFIG}
EOF6

source \$(poetry env info --path)/bin/activate
pluto deploy -y --force app/server.py

bash
EOF1

# Run the script inside the Docker container
docker run -it --rm \
  --platform linux/amd64 \
  -v $(pwd)/script.sh:/script.sh \
  plutolang/pluto:latest bash -c "bash /script.sh"
```
