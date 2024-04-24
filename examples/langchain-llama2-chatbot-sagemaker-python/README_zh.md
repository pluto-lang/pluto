---
title: 基于 AWS 和 LangChain 的 Llama2 会话聊天机器人 - Python
description: 在本指南中，你将了解如何结合 Pluto、AWS 服务、LangChain 和 Llama2 构建一个简易的会话型聊天机器人。
tags: ["AWS", "Python", "LangChain", "Llama2"]
---

# 基于 AWS 和 LangChain 的 Llama2 会话聊天机器人

与 [TypeScript 版本的 Pluto 示例](../langchain-llama2-chatbot-sagemaker/)应用区别在于使用 Python 实现。

部署后，第一次执行将会超时，定位到的问题是：Import LangChain 时间过长，达到 50 秒左右，无论是否有 pyc 文件都会如此。Import 结束后，后续执行就会正常。
