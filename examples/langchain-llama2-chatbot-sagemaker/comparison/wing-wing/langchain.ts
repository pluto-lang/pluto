import { LLM } from "langchain/llms/base";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import {
  SageMakerEndpoint,
  SageMakerLLMContentHandler,
} from "@langchain/community/llms/sagemaker_endpoint";
import { DynamoDBChatMessageHistory } from "@langchain/community/stores/message/dynamodb";

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

export function createModel(endpointName: string) {
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
      region: process.env["AWS_REGION"],
      // credentials: {
      //   accessKeyId: "YOUR AWS ACCESS ID",
      //   secretAccessKey: "YOUR AWS SECRET ACCESS KEY",
      // },
    },
  });
}

export function createMemory(tableName: string, partitionKey: string, sessionId: string) {
  return new BufferMemory({
    chatHistory: new DynamoDBChatMessageHistory({
      tableName: tableName,
      partitionKey: partitionKey,
      sessionId: sessionId,
    }),
  });
}

export function createPromptTemplate() {
  return PromptTemplate.fromTemplate(`<|system|>
  You are a cool and aloof robot, answering questions very briefly and directly.
  
  Context:
  {history}</s>
  <|user|>
  {query}</s>
  <|assistant|>`);
}

export function createConversationChain(
  model: LLM,
  memory: BufferMemory,
  promptTemplate: PromptTemplate
) {
  return new ConversationChain({ llm: model, memory: memory, prompt: promptTemplate });
}
