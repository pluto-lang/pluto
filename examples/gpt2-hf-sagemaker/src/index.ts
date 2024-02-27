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
