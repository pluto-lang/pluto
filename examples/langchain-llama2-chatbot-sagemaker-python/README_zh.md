# 基于 AWS 和 LangChain 的 Llama2 会话聊天机器人

与 [TypeScript 版本的 Pluto 示例](../langchain-llama2-chatbot-sagemaker/)应用区别在于使用 Python 实现，尚未成功部署，存在的问题包括：

1. 跨平台部署时，Numpy、Pydantic 等依赖包无法在目标平台正确安装。
2. 压缩包大小超过 AWS Lambda 限制，50MB。
