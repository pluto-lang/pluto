---
title: Deploying LangChain application integrated with Llama2
description: Deploying a LangChain application that seamlessly integrates with the Llama2 large language model using Pluto, ultimately productizing and deploying the LangChain application on the AWS cloud platform with an exposed HTTP interface.
tags: ["AWS", "TypeScript", "LangChain", "Llama2"]
---

# Deploying LangChain Application Integrated with Llama2

This document will guide you through deploying a LangChain application that seamlessly integrates with the Llama2 large language model using Pluto, ultimately productizing and deploying the LangChain application on the AWS cloud platform with an exposed HTTP interface.

This process will create a SageMaker instance on the AWS platform to deploy the [TinyLlama 1.1B](https://huggingface.co/TinyLlama/TinyLlama-1.1B-Chat-v1.0) large language model. Additionally, it will also create two Lambda instances, each built on LangChain and the deployed language model, to implement two fundamental functions: **chat** and **document-based Q&A**.

Throughout the development process, developers don't need to worry about model deployment, AWS resource configuration, and other minutiae; they need only focus on implementing the business logic. Of course, this document is also applicable for scenarios that require the deployment and integration of other open-source models.

<details><summary> Expand to view the complete code of the example application </summary>

````typescript
import { SageMaker, Function } from "@plutolang/pluto";
import { loadQAChain } from "langchain/chains";
import { Document } from "langchain/document";
import { PromptTemplate } from "langchain/prompts";
import {
  SageMakerEndpoint,
  SageMakerLLMContentHandler,
} from "@langchain/community/llms/sagemaker_endpoint";

/**
 * Deploy the Llama2 model on AWS SageMaker using the Hugging Face Text Generation Inference (TGI)
 * container. Here will deploy the TinyLlama-1.1B-Chat-v1.0 model, which can be run on the
 * ml.m5.xlarge instance.
 *
 * Below is a set up minimum requirements for each model size of Llama2 model:
 * ```
 * Model      Instance Type    Quantization    # of GPUs per replica
 * Llama 7B   ml.g5.2xlarge    -               1
 * Llama 13B  ml.g5.12xlarge   -               4
 * Llama 70B  ml.g5.48xlarge   bitsandbytes    8
 * Llama 70B  ml.p4d.24xlarge  -               8
 * ```
 * The initial limit set for these instances is zero. If you need more, you can request an increase
 * in quota via the [AWS Management Console](https://console.aws.amazon.com/servicequotas/home).
 */
const sagemaker = new SageMaker(
  "llama-2-7b",
  "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
  {
    instanceType: "ml.m5.xlarge",
    envs: {
      // HF_MODEL_ID: "meta-llama/Llama-2-7b-chat-hf",
      HF_MODEL_ID: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
      HF_TASK: "text-generation",
      // If you want to deploy the Meta Llama2 model, you need to request a permission and prepare the
      // token. You can get the token from https://huggingface.co/settings/tokens
      // HUGGING_FACE_HUB_TOKEN: "hf_EmXPwpnyxxxxxxx"
    },
  }
);

/**
 * TODO: Given the constraints of the current version of Deducer, we have to place the following
 * code within the separated function. Once we've upgraded Deducer, it'll be necessary to move this
 * code outside of the function.
 */
async function createSageMakerModel() {
  // Custom for whatever model you'll be using
  class LLama27BHandler implements SageMakerLLMContentHandler {
    contentType = "application/json";

    accepts = "application/json";

    async transformInput(prompt: string, modelKwargs: Record<string, unknown>): Promise<any> {
      const payload = {
        inputs: prompt,
        parameters: modelKwargs,
      };
      const stringifiedPayload = JSON.stringify(payload);
      return new TextEncoder().encode(stringifiedPayload);
    }

    async transformOutput(output: any): Promise<string> {
      const response_json = JSON.parse(new TextDecoder("utf-8").decode(output));
      const content: string = response_json[0]["generated_text"] ?? "";
      return content;
    }
  }

  return new SageMakerEndpoint({
    endpointName: sagemaker.endpointName,
    modelKwargs: {
      temperature: 0.5,
      max_new_tokens: 700,
      top_p: 0.9,
    },
    endpointKwargs: {
      CustomAttributes: "accept_eula=true",
    },
    contentHandler: new LLama27BHandler(),
    clientOptions: {
      // In theory, there's no need to supply the following details as the code will be executed within
      // the AWS Lambda environment. However, due to the way SageMakerEndpoint is implemented, it's
      // required to specify a region.
      region: process.env["AWS_REGION"],
      // credentials: {
      //   accessKeyId: "YOUR AWS ACCESS ID",
      //   secretAccessKey: "YOUR AWS SECRET ACCESS KEY",
      // },
    },
  });

  // TODO: Use the following statement to help the deducer identify the right relationship between
  // Lambda and SageMaker. This will be used to grant permission for the Lambda instance to call
  // upon the SageMaker endpoint. This code should be removed after the deducer supports the
  // analysis of libraries.
  // TODO: bug: only asynchrous function can be successfully analyzed by deducer.
  await sagemaker.invoke({});
}

/**
 * Why we don't use the Router (Api Gateway) to handle the requests? Because the ApiGateway comes
 * with a built-in 30-second timeout limit, which unfortunately, can't be increased. This means if
 * the generation process takes longer than this half-minute window, we'll end up getting hit with a
 * 503 Service Unavailable error. Consequently, we directly use the Lambda function to handle the
 * requests.
 *
 * For more details, check out:
 * https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
 *
 * You can send a POST HTTP request to the Lambda function using curl or Postman. The request body
 * needs to be set as an array representing the function's arguments. Here's an example of a curl
 * request:
 * ```sh
 * curl -X POST https://<your-lambda-url-id>.lambda-url.<region>.on.aws/ \
 *   -H "Content-Type: application/json" \
 *   -d '["What is the capital of France?"]'
 * ```
 * If you get an error message such as `{"code":400,"body":"Payload should be an array."}`, you can
 * add a query parameter, such as `?n=1`, to the URL to resolve it. I don't know why it turns into a
 * GET request when I don't include the query parameter, even though the curl log indicates it's a
 * POST request. If you know the reason, please let me know.
 */

/**
 * The following code is creating a chain for the chatbot task. It can answer the user-provided question.
 */
// TODO: Bug: The deducer fails to identify the function's resources if the return value of the
// constructor isn't assigned to a variable.
const chatFunc = new Function(
  async (query) => {
    const model = await createSageMakerModel();
    const promptTemplate = PromptTemplate.fromTemplate(`<|system|>
You are a cool and aloof robot, answering questions very briefly and directly.</s>
<|user|>
{query}</s>
<|assistant|>`);

    const chain = promptTemplate.pipe(model);
    const result = await chain.invoke({ query: query });

    const answer = result
      .substring(result.indexOf("<|assistant|>") + "<|assistant|>".length)
      .trim();
    return answer;
  },
  {
    name: "chatbot", // The name should vary between different functions, and cannot be empty if there are more than one function instances.
  }
);

/**
 * The following code is creating a chain for the question answering task. It can be used to answer
 * the question based on the given context.
 */
const exampleDoc1 = `
Peter and Elizabeth took a taxi to attend the night party in the city. While in the party, Elizabeth collapsed and was rushed to the hospital.
Since she was diagnosed with a brain injury, the doctor told Peter to stay besides her until she gets well.
Therefore, Peter stayed with her at the hospital for 3 days without leaving.
`;

const promptTemplate = `Use the following pieces of context to answer the question at the end.

{context}

Question: {question}
Answer:`;

const qaFunc = new Function(
  async (query) => {
    const docs = [new Document({ pageContent: exampleDoc1 })];

    const prompt = new PromptTemplate({
      template: promptTemplate,
      inputVariables: ["context", "question"],
    });

    const chain = loadQAChain(await createSageMakerModel(), {
      type: "stuff",
      prompt: prompt,
    });

    const result = await chain.invoke({ input_documents: docs, question: query });
    return result["text"];
  },
  {
    name: "qa",
  }
);
````

</details>

## Prerequisites

If you haven't installed Pluto yet, please follow the steps [here](https://github.com/pluto-lang/pluto#-quick-start) to install Pluto and configure your AWS credentials.

## Creating the Project

First, in your working directory, execute the `pluto new` command, which will interactively create a new project and generate a new folder in your current directory containing the basic structure of a Pluto project.

For this example, the project is named `langchain-llama2-sagemaker`, with AWS as the selected platform and Pulumi as the deployment engine.

```
$ pluto new
? Project name langchain-llama2-sagemaker
? Stack name dev
? Select a platform AWS
? Select an provisioning engine Pulumi
Info:  Created a project, langchain-llama2-sagemaker
```

Upon completion, enter the newly created project folder `langchain-llama2-sagemaker`, and you will see a directory structure like this:

```
langchain-llama2-sagemaker/
├── README.md
├── package.json
├── src
│   └── index.ts
└── tsconfig.json
```

Then, execute `npm install` to download the necessary dependencies.

## Writing the Code

Next, we'll modify the `src/index.ts` file to build our example application, which is also very straightforward.

### 1) Creating a SageMaker Instance

First, we import the `@plutolang/pluto` package, and then we create a `SageMaker` instance to deploy our model.

In the `SageMaker` constructor, we need to provide a name, the Docker image URI of the model, and some configuration information. The name is unrelated to the model you want to deploy; it simply determines the name of the SageMaker instance.

````typescript
import { SageMaker, Function } from "@plutolang/pluto";
import { loadQAChain } from "langchain/chains";
import { Document } from "langchain/document";
import { PromptTemplate } from "langchain/prompts";
import {
  SageMakerEndpoint,
  SageMakerLLMContentHandler,
} from "@langchain/community/llms/sagemaker_endpoint";

/**
 * Deploy the Llama2 model on AWS SageMaker using the Hugging Face Text Generation Inference (TGI)
 * container. Here will deploy the TinyLlama-1.1B-Chat-v1.0 model, which can be run on the
 * ml.m5.xlarge instance.
 *
 * Below is a set up minimum requirements for each model size of Llama2 model:
 * ```
 * Model      Instance Type    Quantization    # of GPUs per replica
 * Llama 7B   ml.g5.2xlarge    -               1
 * Llama 13B  ml.g5.12xlarge   -               4
 * Llama 70B  ml.g5.48xlarge   bitsandbytes    8
 * Llama 70B  ml.p4d.24xlarge  -               8
 * ```
 * The initial limit set for these instances is zero. If you need more, you can request an increase
 * in quota via the [AWS Management Console](https://console.aws.amazon.com/servicequotas/home).
 */
const sagemaker = new SageMaker(
  "llama-2-7b",
  "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
  {
    instanceType: "ml.m5.xlarge",
    envs: {
      // HF_MODEL_ID: "meta-llama/Llama-2-7b-chat-hf",
      HF_MODEL_ID: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
      HF_TASK: "text-generation",
      // If you want to deploy the Meta Llama2 model, you need to request a permission and prepare the
      // token. You can get the token from https://huggingface.co/settings/tokens
      // HUGGING_FACE_HUB_TOKEN: "hf_EmXPwpnyxxxxxxx"
    },
  }
);
````

If you wish to deploy the full Meta Llama2 7B, 13B, 70B models, there are two points you need to be aware of:

1. Different Llama2 large language models have different instance requirements; you need to select the appropriate instance type based on the model's minimum requirements:
   - Llama 7B: `ml.g5.2xlarge`
   - Llama 13B: `ml.g5.12xlarge`
   - Llama 70B: `ml.p4d.24xlarge`
2. You need to request download permissions from Meta in advance. You should see prompts on [this webpage](https://huggingface.co/meta-llama/Llama-2-7b-chat-hf), and you need to complete the permission application following the prompts. In addition, you need to prepare a Hugging Face token, which you can obtain from [here](https://huggingface.co/settings/tokens).

If you want to deploy another large language model, just make sure the one you intend to deploy supports TGI. You can find models that support TGI [here](https://huggingface.co/models?other=text-generation-inference). After identifying the model to deploy, fill in the model's ID and task type in `envs`. The model ID is the name of the model on the webpage, and the task type is reflected in the model's tags.

### 2) Adapting the SageMaker Deployed Model to LangChain's LLM Type

The LangChain community has provided a `SageMakerEndpoint` class to adapt models deployed with SageMaker to the LLM model type accepted by LangChain. We just need to implement the `SageMakerLLMContentHandler` interface to adapt the model's input and output.

The `SageMakerEndpoint` constructor's parameter list includes `EndpointName`, which, in Pluto-based applications, can be obtained by calling `sagemaker.endpointName`—no need to look it up in the console. Additionally, the `region` parameter required by clientOptions can be directly obtained from environment variables, as the written code will eventually be deployed as AWS Lambda instances.

```typescript
async function createSageMakerModel() {
  class LLama27BHandler implements SageMakerLLMContentHandler {
    contentType = "application/json";

    accepts = "application/json";

    async transformInput(prompt: string, modelKwargs: Record<string, unknown>): Promise<any> {
      const payload = {
        inputs: prompt,
        parameters: modelKwargs,
      };
      const stringifiedPayload = JSON.stringify(payload);
      return new TextEncoder().encode(stringifiedPayload);
    }

    async transformOutput(output: any): Promise<string> {
      const response_json = JSON.parse(new TextDecoder("utf-8").decode(output));
      const content: string = response_json[0]["generated_text"] ?? "";
      return content;
    }
  }

  return new SageMakerEndpoint({
    endpointName: sagemaker.endpointName,
    modelKwargs: {
      temperature: 0.5,
      max_new_tokens: 700,
      top_p: 0.9,
    },
    endpointKwargs: {
      CustomAttributes: "accept_eula=true",
    },
    contentHandler: new LLama27BHandler(),
    clientOptions: {
      region: process.env["AWS_REGION"],
    },
  });

  // Cannot be omitted.
  await sagemaker.invoke({});
}
```

You might wonder why the `class` definition is inside a function and why there's a statement after `return`. This is because the current version of Pluto is still immature, and this workaround is the only way to ensure the correct construction of AWS Lambda instances. If you're interested in the principles and implementation details, you're welcome to read [this document](https://pluto-lang.vercel.app/documentation/design/deducer-design) and very much **welcome to join in the co-construction**.

### 3) Creating a Lambda Function for Dialogue

Next, we implement the most basic dialogue function based on LangChain's `PromptTemplate`.

We create a `Function` object `chatFunc`, which corresponds to an AWS Lambda instance. This function takes a `query` as an input parameter and returns the result responded to by the large language model.

```typescript
const chatFunc = new Function(
  async (query) => {
    const model = await createSageMakerModel();
    const promptTemplate = PromptTemplate.fromTemplate(`<|system|>
You are a cool and aloof robot, answering questions very briefly and directly.</s>
<|user|>
{query}</s>
<|assistant|>`);

    const chain = promptTemplate.pipe(model);
    const result = await chain.invoke({ query: query });

    const answer = result
      .substring(result.indexOf("<|assistant|>") + "<|assistant|>".length)
      .trim();
    return answer;
  },
  {
    name: "chatbot", // The name should vary between different functions, and cannot be empty if there are more than one function instances.
  }
);
```

For the reasons mentioned earlier, it cannot be avoided to create this variable, even if it won't be used later...

### 4) Creating a QA Lambda Function

Finally, we create a `Function` object `qaFunc`, which, like the previous one, corresponds to an AWS Lambda instance. This function takes a `query` as an input parameter, and the large language model will respond based on the question and the input document.

```typescript
const exampleDoc1 = `
Peter and Elizabeth took a taxi to attend the night party in the city. While in the party, Elizabeth collapsed and was rushed to the hospital.
Since she was diagnosed with a brain injury, the doctor told Peter to stay besides her until she gets well.
Therefore, Peter stayed with her at the hospital for 3 days without leaving.
`;

const promptTemplate = `Use the following pieces of context to answer the question at the end.

{context}

Question: {question}
Answer:`;

const qaFunc = new Function(
  async (query) => {
    const docs = [new Document({ pageContent: exampleDoc1 })];

    const prompt = new PromptTemplate({
      template: promptTemplate,
      inputVariables: ["context", "question"],
    });

    const chain = loadQAChain(await createSageMakerModel(), {
      type: "stuff",
      prompt: prompt,
    });

    const result = await chain.invoke({ input_documents: docs, question: query });
    return result["text"];
  },
  {
    name: "qa",
  }
);
```

At this point, our code is complete. Next, we just need to deploy it to AWS, and we can invoke our model via HTTP requests.

## One-Click Deployment

Deploying a Pluto project is very simple. Just execute the `pluto deploy` command in the project root directory, and Pluto will automatically deploy the project to AWS. The deployment result will look like the following, where red represents the dialogue Lambda instance, and green represents the Q&A Lambda instance. **Note: The deployment of SageMaker takes a long time, so please be patient.**

![Deployment Diagram](../../assets/langchain-llama2-sagemaker-deployment.png)

![Architecture Diagram](../../assets/langchain-llama2-sagemaker-arch.png)

The architecture of the entire application after deployment is as shown in the image above, consisting mainly of a SageMaker instance and two Lambda functions. However, actual deployment is far more complex than shown; we need to create and configure **nearly 20 configuration items**, including SageMaker's Model, Endpoint, Lambda instances, and multiple IAM roles and permissions. But with Pluto, all these operations can be completed automatically with a **single command**.

## Function Testing

Next, we can use the returned URL to access our application.

We can use curl or Postman to send POST HTTP requests to the Lambda functions. Note that the request body needs to be in an array format, indicating the list of function parameters. Below is an example of a curl request:

```sh
curl -X POST https://<your-lambda-url-id>.lambda-url.<region>.on.aws/ \
  -H "Content-Type: application/json" \
  -d '["What is the capital of France?"]'
```

If you receive an error message with content `{"code":400,"body":"Payload should be an array."}`, you can try adding a query parameter to the URL to solve it, such as `https://<your-lambda-url-id>.lambda-url.<region>.on.aws/?n=1`. It's currently unclear why this problem occurs, even though the curl log clearly shows a POST request, it turns into a GET request in the Lambda logs without the query parameter. If you know the reason, please let me know.

The following image shows the request and response for the dialogue function:

![Chat Function](../../assets/langchain-llama2-sagemaker-chat.png)

The following image shows the request and response for the document Q&A function:

![Q&A Function](../../assets/langchain-llama2-sagemaker-qa.png)

You can also try using Pluto's KVStore to build a chat robot 🤖 that can hold conversations. Contributions and PRs are welcome!

## Q&A

### Why not use a Router (Api Gateway) to handle requests?

ApiGateway comes with a non-adjustable 30-second timeout limit. This means that if the generation process exceeds this time window, we would receive a `503 Service Unavailable` error. Therefore, we directly use Lambda functions to handle requests. In the future, we will try to improve the experience by supporting WebSocket.
