import * as aws from "../../src/aws";

const sagemaker = new aws.SageMaker(
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

export const endpointName = sagemaker.endpointName;
