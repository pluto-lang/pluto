---
title: 使用 Router、Queue、KVStore 的简单 Web 应用 - Python
description: 使用 Router、Queue、KVStore 构建一个简单的 Web 应用，涉及 HTTP 路由、消息队列订阅等功能，可以部署到 AWS 或 Kubernetes 上。
---

# 使用 Router、Queue、KVStore 的简单 Web 应用 - Python

这是[快速开始](../../docs/documentation/getting-started.zh-CN.md)中 Python 版本的示例 Pluto 应用，你可以从[这里](./)获取完整的代码。

这个应用整体架构如下图，主要有 2 个路由：1）`/hello`，产生一个时间戳，并将这个时间戳发布到消息队列；2）`/store`，从 KV 数据库中获取上次访问 `/hello` 的时间戳，并返回。消息队列会有一个订阅者，将消息保存到 KV 数据库中。这个应用部署被部署到 AWS 或 Kubernetes 上。

<p align="center">
  <img src="../../assets/getting-started-case-arch.png" alt="case arch" width="450">
</p>

## 0 环境

如果你还没有配置 Pluto 开发环境，请参考[快速开始](../../docs/documentation/getting-started.zh-CN.md)中的第 0、1 步进行配置，也可以使用 Pluto 提供的[在线沙盒或容器](../../docs/documentation/getting-started.zh-CN.md#其他使用方式)体验。

## 1 编写

首先，运行以下命令创建一个 Pluto 工程项目:

```shell
pluto new
```

这条命令将交互式地创建一个项目，根据你的需要选择编程语言、目标平台、项目信息等，Pluto 会使用提供的项目名称创建一个目录。进入刚创建的项目目录，首先需要安装依赖：

```shell
cd <project_dir>
npm install # 国内安装 @pulumi/aws 时可能会遇到网络问题，容器镜像体已缓存该包，欢迎体验
pip install -r requirements.txt
```

在 `app/main.py` 中已经有了一个简单的示例代码，你可以根据自己的需求修改，也可以直接部署体验。

## 2 部署

在正式部署之前，需要配置目标平台的凭证信息。

如果你选择的目标平台为 AWS，可以使用 `aws configure` 配置用户凭证，或自行创建 `~/.aws/credentials` 文件并配置，格式如下：

```ini
[default]
aws_access_key_id = <your_access_key_id>
aws_secret_access_key = <your_secret_access_key>
```

此外，Pluto 会尝试读取你的 AWS 配置文件 `~/.aws/config` 以获取默认的 AWS Region，如果没有配置，会尝试从环境变量 `AWS_REGION` 获取。**如果两者都没有配置，Pluto 在部署时将会报错。**

如果你选择的目标平台为 Kubernetes，需要事先在 K8s 中安装 Knative，并关闭缩容到零的功能（因为 Pluto 尚不支持 Ingress 转发到 Knative servering，欢迎大佬来改进）。你可以根据[这篇文档](../../docs/dev_guide/setup-k8s-dev-env.en.md)配置所需的 Kubernetes 环境。

配置完成后，只需要执行下面这一条命令就能将应用发布到最初配置的云平台上：

```shell
pluto deploy
```

<p align="center">
  <img src="../../assets/getting-started-aws-arch.png" alt="aws arch" width="450">
</p>

Pluto 将从应用代码中推导出需要 1 个路由、1 个消息队列、1 个 KV 数据库和 3 个函数对象，然后，Pluto 将自动地在你指定的云平台上创建相应的资源实例，并配置好它们之间的依赖关系。以 AWS 为例，将会创建 1 个 API Gateway、1 个 SNS、1 个 DynamoDB 和 3 个 Lambda 函数，同时配置好触发器、角色、权限等。

## 3 测试

恭喜！你已经成功部署了一个完整的 Web 应用程序。你应该会从终端中看到输出的 URL 地址，访问这个地址，就可以使用这个应用了。你可以使用 `curl` 或者浏览器访问这个地址，测试你的应用是否正常工作。如果使用 `curl`，可以按照以下方式测试：

```shell
curl <your_url>/hello?name=pluto
# 上面这条 URL 会打印出发布了一条消息，消息中带有访问时间
# 示例： Publish a message: pluto access at 1712654279444.

curl <your_url>/store?name=pluto
# 上面这条 URL 会打印出你上次访问 /hello 的时间
# 示例： Fetch pluto access message: pluto access at 1712654279444.
```

## 4 清理

如果你想从云平台上下线这个应用，可以使用以下命令：

```shell
pluto destroy
```

## 多平台部署

如果你想部署到其他云平台可以通过创建新的 stack，并在部署时指定 stack 的方式进行：

创建新的 stack：

```shell
pluto stack new
```

部署时指定 stack：

```shell
pluto deploy --stack <new_stack>
```
