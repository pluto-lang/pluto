# Deploying GPT-2 Large Language Model on AWS SageMaker

Pluto simplifies the deployment of Hugging Face models on AWS SageMaker and enables integration with other AWS services such as SNS, DynamoDB, Lambda, and API Gateway.

This document will construct a simple example that deploys the GPT-2 from Hugging Face on AWS SageMaker and exposes it via API Gateway, allowing users to invoke it through HTTP requests.

You can directly experience this sample application via [CodeSandbox](https://codesandbox.io/p/devbox/gpt2-hf-sagemaker-27h3qh).

<details><summary>Complete code for this example</summary>

```typescript
import { Router, SageMaker } from "@plutolang/pluto";

/**
 * Deploy the GPT2 model on AWS SageMaker using the Hugging Face Text Generation Inference (TGI)
 * container. You can find suitable containers from:
 *
 * AWS Available Deep Learning Containers Images:
 * https://github.com/aws/deep-learning-containers/blob/master/available_images.md
 *
 * HuggingFace Text Generation Inference (TGI) Containers:
 * https://github.com/aws/deep-learning-containers/releases?q=tgi+AND+gpu&expanded=true
 */
const sagemaker = new SageMaker(
  "gpt2",
  "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
  {
    instanceType: "ml.m5.xlarge",
    envs: {
      HF_MODEL_ID: "openai-community/gpt2",
      HF_TASK: "text-generation",
    },
  }
);

// Create a router to handle the HTTP requests
const router = new Router("router");

// Receive the requsets from users and send them the response from the SageMaker endpoint.
router.post("/generate", async (req) => {
  const payload = req.body;
  if (!payload) {
    return {
      statusCode: 400,
      body: "The request body is empty. Please provide a valid input.",
    };
  }

  const data = JSON.parse(payload);
  if (!data["inputs"]) {
    // The payload should be a JSON object with a key "inputs".
    return {
      statusCode: 400,
      body: "The request body is invalid. Please provide a valid input.",
    };
  }

  // Invoke the SageMaker endpoint with the input data and return the response to the users.
  const output = await sagemaker.invoke(data);
  return {
    statusCode: 200,
    body: JSON.stringify(output),
  };
});

// Return the SageMaker endpoint URL to the users
router.get("/endpoint", async () => {
  const endpointUrl = sagemaker.endpointUrl();
  return {
    statusCode: 200,
    body: endpointUrl,
  };
});
```

</details>

## Prerequisites

If you have not installed Pluto yet, please follow the steps [here](https://github.com/pluto-lang/pluto#-quick-start) to install Pluto and configure your AWS credentials.

## Creating the Project

First, in your working directory, execute the `pluto new` command, which will interactively create a new project and generate a new folder in your current directory containing the basic structure of a Pluto project.

Here, I named my project `gpt2-hf-sagemaker`, chose AWS as the platform, and used Pulumi for the deployment engine.

```
$ pluto new
? Project name gpt2-hf-sagemaker
? Stack name dev
? Select a platform AWS
? Select an provisioning engine Pulumi
Info: Created a project, gpt2-hf-sagemaker
```

After creation, enter the newly created project folder `gpt2-hf-sagemaker`, and you will see a directory structure like this:

```
gpt2-hf-sagemaker/
├── README.md
├── package.json
├── src
│   └── index.ts
└── tsconfig.json
```

Next, execute `npm install` to download the required dependencies.

## Writing the Code

Next, we'll modify the `src/index.ts` file to build our example application, which is also very straightforward.

### 1) Creating a SageMaker Instance

First, we import the `@plutolang/pluto` package and then create a `SageMaker` instance to deploy our model.

In the `SageMaker` constructor, we need to provide a name, the model's Docker image URI, and some configuration information. The name is unrelated to the model you want to deploy; it is merely to determine the name of the SageMaker instance.

```typescript
import { Router, SageMaker } from "@plutolang/pluto";

const sagemaker = new SageMaker(
  /* name */ "gpt2",
  /* imageUri */ "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
  /* options */ {
    instanceType: "ml.m5.xlarge",
    envs: {
      HF_MODEL_ID: "openai-community/gpt2", // Replace with the model ID you want to deploy
      HF_TASK: "text-generation", // Replace with the task type according to the model
    },
  }
);
```

The Docker image used here is the Hugging Face TGI container, and you can find more containers [here](https://github.com/aws/deep-learning-containers/releases?q=tgi+AND+gpu&expanded=true).

If you want to deploy another large language model, you only need to make sure the model you want to deploy supports TGI. You can find models that support TGI [here](https://huggingface.co/models?other=text-generation-inference). After identifying the model to deploy, you'll need to fill in the model's ID and task type in `envs`. The model ID is the name of the model on the webpage, and the task type is reflected in the model's tags.

### 2) Creating a Router

Next, we'll create a router `router` and write two route handlers, one for receiving user generation requests and returning the results from SageMaker, and another for returning the SageMaker instance's Endpoint URL.

Pluto's Router type corresponds to AWS's ApiGateway. During deployment, Pluto will automatically create an API Gateway.

```typescript
// Create a router to handle the HTTP requests
const router = new Router("router");

// Receive the requsets from users and send them the response from the SageMaker endpoint.
router.post("/generate", async (req) => {
  const payload = req.body;
  if (!payload) {
    return {
      statusCode: 400,
      body: "The request body is empty. Please provide a valid input.",
    };
  }

  const data = JSON.parse(payload);
  if (!data["inputs"]) {
    // The payload should be a JSON object with a key "inputs".
    return {
      statusCode: 400,
      body: "The request body is invalid. Please provide a valid input.",
    };
  }

  // Invoke the SageMaker endpoint with the input data and return the response to the users.
  const output = await sagemaker.invoke(data);
  return {
    statusCode: 200,
    body: JSON.stringify(output),
  };
});

// Return the SageMaker endpoint URL to the users
router.get("/endpoint", async () => {
  const endpointUrl = sagemaker.endpointUrl();
  return {
    statusCode: 200,
    body: endpointUrl,
  };
});
```

At this point, our code is complete. Next, we just need to deploy it to AWS, and we can invoke our model via HTTP requests.

## One-Click Deployment

Deploying a Pluto project is also very simple. Just execute the `pluto deploy` command in the project root directory, and Pluto will automatically deploy the project to AWS.

![Deployment](../../assets/gpt2-hf-sagemaker-deployment.png)

In the end, you will get a URL for an API Gateway through which you can access your model.

![Access](../../assets/gpt2-hf-sagemaker-access.png)

![Architecture](../../assets/gpt2-hf-sagemaker-arch.png)

The architecture of the entire application after deployment is shown in the image above, consisting of a SageMaker instance, two Lambda functions, and an API Gateway. However, the actual deployment is much more complex than shown. Nearly 30 configuration items need to be created and configured, including the SageMaker Model, Endpoint, Api Gateway Deployment, Stage, and multiple IAM roles and permissions. But with Pluto, all these operations can be completed automatically with a single command.

**Note: SageMaker deployment can take a long time, so please be patient.**
