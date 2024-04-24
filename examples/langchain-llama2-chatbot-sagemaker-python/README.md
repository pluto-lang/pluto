---
title: Building a Llama2 conversational chatbot with AWS and LangChain - Python
description: Create a simple conversational chatbot by integrating Pluto, AWS services, LangChain, and Llama2.
tags: ["AWS", "Python", "LangChain", "Llama2"]
---

# Building a Llama2 Conversational Chatbot with AWS and LangChain

The difference between this and the [TypeScript version of the Pluto example](../langchain-llama2-chatbot-sagemaker/) lies in its implementation in Python.

After deployment, the initial execution might time out. The problem we've found is that importing LangChain is taking too long, approximately 50 seconds, even with .pyc files present. However, once the import is done, subsequent executions run smoothly.

In this guide, you'll discover how to create a simple conversational chatbot by integrating Pluto, AWS services, LangChain, and Llama2. We’ll walk you through the architecture components of our example application and how to deploy and operate it using Pluto.

## Architecture Overview

![Chatbot Architecture Diagram](../../assets/langchain-llama2-chatbot-sagemaker-arch.png)

As illustrated above, our example application relies on the following AWS services and resources:

- **Amazon SageMaker**: Deploying the Llama2 model
  - Model, EndpointConfiguration, Endpoint, Role
- **Amazon DynamoDB**: Persisting session messages
  - Table
- **AWS Lambda**: Executing backend business logic
  - Function, Role, Policy
- **Amazon API Gateway**: Providing an HTTP API endpoint for user access
  - Api, Route, Integration, Deployment, Stage

## Deployment Steps

To deploy this chatbot, please follow the steps below:

1. Install Pluto and configure AWS access credentials. Detailed instructions can be found in the [Pluto Quick Start Guide](https://github.com/pluto-lang/pluto#-quick-start).

2. Run the following commands in the root directory of the example application to initialize:

   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. Replace `HUGGING_FACE_HUB_TOKEN` in the `src/index.ts` file with your Hugging Face Hub Token. If you don’t have a token yet, generate one [here](https://huggingface.co/settings/tokens).

4. Deploy the application:

   ```bash
   pluto deploy
   ```

**Be patient, as deploying the model in SageMaker can take some time.** Once the deployment is complete, the console will display the URL for ApiGateway, which you can access via a browser or a curl command. Here is a simple test command:

```bash
CHATBOT_API_URL=your ApiGateway URL
time curl --get "$CHATBOT_API_URL/chat" \
  --data-urlencode "sessionid=session_1" \
  --data-urlencode "query='What is the capital of China?'"
```

By using the same `sessionid`, you can conduct multiple rounds of conversation testing.

To clean up resources, simply run the `pluto destroy` command in the root directory of the example application.

## Extending the Example Application

This example application serves as a basic chatbot, but you can expand it based on your needs to make it more powerful and practical. For instance, you could:

- **Add custom business logic**: Write more Lambda functions to execute more complex business logic tailored to specific business needs.
- **Integrate additional AWS services**: Take advantage of the wide array of services provided by AWS, such as Amazon SNS as a message queue for asynchronous message processing.
- **Enhance user experience**: Develop a frontend user interface to allow users to interact with the chatbot through a web page or mobile app, rather than solely through API requests.
