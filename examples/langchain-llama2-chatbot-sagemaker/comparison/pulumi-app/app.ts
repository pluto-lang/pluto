import * as pulumi from "@pulumi/pulumi";

import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import {
  SageMakerEndpoint,
  SageMakerLLMContentHandler,
} from "@langchain/community/llms/sagemaker_endpoint";
import { DynamoDBChatMessageHistory } from "@langchain/community/stores/message/dynamodb";

const awsConfig = new pulumi.Config("aws");
const awsRegion = awsConfig.require("region");

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
    const answer = content
      .substring(content.indexOf("<|assistant|>") + "<|assistant|>".length)
      .trim();
    return answer;
  }
}

function createModel(endpointName: string) {
  return new SageMakerEndpoint({
    endpointName: endpointName,
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
      region: awsRegion,
      // credentials: {
      //   accessKeyId: "YOUR AWS ACCESS ID",
      //   secretAccessKey: "YOUR AWS SECRET ACCESS KEY",
      // },
    },
  });
}

export async function chat(
  endpointName: string,
  tableName: string,
  partitionKey: string,
  sessionId: string,
  query: string
) {
  const memory = new BufferMemory({
    chatHistory: new DynamoDBChatMessageHistory({
      tableName: tableName,
      partitionKey: partitionKey,
      sessionId: sessionId,
    }),
  });

  const promptTemplate = PromptTemplate.fromTemplate(`<|system|>
You are a cool and aloof robot, answering questions very briefly and directly.

Context:
{history}</s>
<|user|>
{query}</s>
<|assistant|>`);

  const llmChain = new ConversationChain({
    llm: createModel(endpointName),
    memory: memory,
    prompt: promptTemplate,
  });

  const result = await llmChain.invoke({ query });
  return result["response"];
}
