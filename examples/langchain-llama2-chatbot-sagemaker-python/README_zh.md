# 基于 AWS 和 LangChain 的 Llama2 会话聊天机器人

与 [TypeScript 版本的 Pluto 示例](../langchain-llama2-chatbot-sagemaker/)应用区别在于使用 Python 实现。

部署后，第一次执行将会超时，定位到的问题是：Import LangChain 时间过长，达到 50 秒左右，无论是否有 pyc 文件都会如此。Import 结束后，后续执行就会正常。
