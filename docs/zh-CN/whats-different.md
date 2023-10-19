# Pluto 与其他产品的区别

## 与 BaaS 类产品的区别

典型产品：Supabase、Appwrite。

在 BaaS 领域，专注于该领域的产品通常提供自管数据库、文件存储等组件。用户可以在后台创建这些组件的实例，并提供相应的客户端 SDK 来接入这些实例。此外，这些产品可能还提供后台数据可视化的功能。

如果你不担心供应商锁定的问题，并且也没有服务部署的顾虑，那么 BaaS 产品可以提供不错的编写体验。你可以轻松创建数据库等组件实例，编程时只需要关注组件的调用方法。

与这类产品相比，Pluto 则帮助开发者在目标云平台上创建属于自己账户的基础设施环境。同时，Pluto 还提供与 BaaS 产品一致的编写体验。

## 与 PaaS 类产品的区别

典型产品：Fly.io、render、Heroku。

与 Fly.io、render、Heroku 等 PaaS 产品相比，Pluto 不专注于容器托管，而是编译生成更细粒度的计算模块，以使用云平台提供的 FaaS 等能力，并且依赖的资源组件直接从用户代码推导生成，不需要用户编写额外配置代码。

## 与脚手架工具的区别

典型产品：Serverless Framework、Serverless Devs。

与 Serverless Framework、Serverless Devs 等脚手架工具相比，Pluto 没有针对具体云厂商、具体框架提供应用编程框架，而是给用户提供一致的编程界面，利用语言技术最终生成适配云厂商的计算模块，并支持在不修改代码的情况下在云平台间迁移。

## 与 IfC 类产品的区别

### 纯注释 IfC 类产品

典型产品：Klotho。

与 Klotho 等基于纯注释的 IfC 产品相比，Pluto 直接从用户代码中推导资源依赖，能够提供更一致的编程体验。同时，编程语言的依赖机制能够带来更高的横向扩展性。

### 基于 SDK 的 IfC 类产品

典型产品：Shuttle、Nitric。

与 Shuttle、Nitric 等基于 SDK 的 IfC（Infra from Code）产品相比，Pluto 没有通过编译时执行用户代码来获取资源依赖，而是采用静态推导用户代码的方式获取。

### 基于编程语言的 IfC 类产品

典型产品：Winglang。

Winglang 与 Pluto 都属于基于编程语言的 IfC 产品，与之相比，Pluto 会生成独立于用户代码的 IaC 代码，使得编译时执行的代码与用户代码不直接相关，用户在编码时不需要关心编译时与运行时区别。

因此，Pluto 与其他产品的关键区别在于：Pluto 通过编程语言技术直接从用户代码推导资源依赖，生成独立于用户代码的 IaC 代码，使得编译时执行的代码与用户代码不直接相关，进而给开发者提供编写代码时不需要感知基础设施配置的体验。