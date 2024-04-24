---
title: Pluto 部署 FastAPI 应用
description: 这个示例应用程序展示了如何将 FastAPI 应用程序与 Pluto 结合使用。
tags: ["AWS", "Python", "FastAPI"]
---

# Pluto 部署 FastAPI 应用

这个示例应用程序展示了如何将 FastAPI 应用程序与 Pluto 结合使用。

## 前提

- pulumi
  - 可以根据[安装指南](https://www.pulumi.com/docs/install/)安装。
- pluto
  - 可以使用 `npm i -g @plutolang/cli` 来安装。

## 开始

可以按照一下步骤部署这个示例：

1. 克隆仓库：

```bash
git clone https://github.com/pluto-lang/pluto
cd examples/fastapi
```

2. 安装所需的依赖项：

```bash
npm install
pip install -r requirements.txt
```

3. 修改 `app/main.py` 文件：

- 在 `return_app` 函数内定义你的 FastAPI 应用程序，需要确保所有的路由都在这个函数内定义。
- 将 `api_gateway_base_path` 变量设置为 API 网关的阶段名称，目前 Pluto 部署的阶段名称默认为 `/dev`。

4. 部署应用程序：

```bash
pluto deploy
```

这条命令会把你的 FastAPI 应用程序作为无服务器应用程序部署到 AWS 上，将创建一个 Api Gateway 实例和一个 Lambda 函数实例来处理请求。同时会在终端打印出 AWS 的 Api Gateway 的 URL，你可以通过访问这个 URL 来访问部署的应用程序。

## 注意

必须从一个函数返回 FastAPI 应用程序，并且路由应该在该函数内定义。这是因为 Pluto 是通过静态程序分析的方式找到基础设施类方法调用 `router.all` 的所有依赖语句，然后并将所有依赖语句封装到一个代码包中。如果 FastAPI 应用程序定义在函数外部，Pluto 将只找到应用程序对象的定义语句，而路由的配置语句将不被包含在最终的代码包中，导致部署后的应用程序无法正常工作。

`app/main_best.py` 展示了 Pluto 通过 SDK 集成 FastAPI 应用程序的最佳界面，但是目前还没有实现。
