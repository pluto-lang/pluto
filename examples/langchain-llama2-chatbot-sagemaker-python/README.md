---
title: Building a Llama2 conversational chatbot with AWS and LangChain - Python
description: Create a simple conversational chatbot by integrating Pluto, AWS services, LangChain, and Llama2.
tags: ["AWS", "Python", "LangChain", "Llama2"]
---

# Building a Llama2 Conversational Chatbot with AWS and LangChain

The difference between this and the [TypeScript version of the Pluto example](../langchain-llama2-chatbot-sagemaker/) lies in its implementation in Python.

After deployment, the initial execution might time out. The problem we've found is that importing LangChain is taking too long, approximately 50 seconds, even with .pyc files present. However, once the import is done, subsequent executions run smoothly.
