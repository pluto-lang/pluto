# Pluto 部署 LangServe 应用

这个示例展示了如何使用 Pluto 将一个 LangServe 的[示例应用](https://github.com/langchain-ai/langserve/tree/main/examples/agent_with_history)部署到 AWS 上，Pluto 会创建一个 Api Gateway 实例作为 LangServe 应用的入口，同时会创建一个 Lambda 实例来处理请求。

部署后的 LangServe 应用可以通过 Pluto 提供的 Api Gateway 地址访问，并且支持通过 LangServe 的 RemoteRunnable 调用。

本示例的 `app` 目录下包含 3 个文件：

- `main.py`：Pluto 适配的 LangServe 应用。
- `client.py`：LangServe 应用的客户端。
- `main_origin.py`：LangServe [示例应用](https://github.com/langchain-ai/langserve/tree/main/examples/agent_with_history)原本的实现，仅用于对比。原本实现使用 uvicorn 作为 Web 服务器。

## 开始

可以按照以下步骤部署这个示例：

1. 克隆仓库：

```bash
git clone https://github.com/pluto-lang/pluto
cd examples/langserve-agent-with-history
```

2. 安装所需的依赖项：

```bash
npm install
pip install -r requirements.txt
```

3. 修改 `app/main.py` 文件：

- 你可以在 `app/main.py` 文件中添加更多的路由，但注意路径不要重复。
- 在 `return_fastapi_app` 函数内定义你的 FastAPI 应用程序，需要确保所有与 FastAPI 相关的代码都在这个函数内。
- 将 `api_gateway_base_path` 变量设置为 API 网关的阶段名称，目前 Pluto 部署的阶段名称默认为 `/dev`。

4. 部署应用程序：

```bash
pluto deploy
```

这条命令会把你的 LangServe 应用程序作为无服务器应用程序部署到 AWS 上，将创建一个 Api Gateway 实例和一个 Lambda 函数实例来处理请求。同时会在终端打印出 AWS 的 Api Gateway 的 URL，你可以通过访问这个 URL 来访问部署的应用程序。

## 访问

将 `app/client.py` 中 RemoteRunnable 的参数修改为 Pluto 部署后输出的 Api Gateway URL，然后运行 `app/client.py` 文件，就可以与你的 LangServe 应用程序进行交互了。

如果你想访问 LangServe 自带的 Playground，你可以在浏览器中访问 `https://<your-api-gateway-url>/dev/playground`，注意 `your-api-gateway-ur` 是 Pluto 在终端输出的完整 URL，包括最后的 `/dev`，因此整个 URL 中有两个 `/dev`。

## 注意

- Pluto 目前仅支持单文件，且不支持 Stream 访问。
- 由于第一次加载 LangChain 依赖库可能会比较慢，所以第一次访问 Playground 或者调用 LangServe 服务可能会比较慢，超过 30 秒后会自动超时。因此，如果你在第一次访问时遇到超时问题，请再次尝试。
