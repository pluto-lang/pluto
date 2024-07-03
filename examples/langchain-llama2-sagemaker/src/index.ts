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
  "chatbot" // The name should vary between different functions, and cannot be empty if there are more than one function instances.
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

const qaFunc = new Function(async (query) => {
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
}, "qa");
