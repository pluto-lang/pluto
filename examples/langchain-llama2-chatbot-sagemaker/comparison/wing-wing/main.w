// This is an example of how to use the LangChain library in Winglang, but it's not working.
bring cloud;
bring dynamodb;
bring sagemaker;
bring expect;

class LangChainFactory {
  pub extern "./langchain.ts" static inflight createModel(endpointName: str);
  pub extern "./langchain.ts" static inflight createMemory(tableName: str, partitionKey: str, sessionId: str);
  pub extern "./langchain.ts" static inflight createPromptTemplate();
  pub extern "./langchain.ts" static inflight createConversationChain(model: any, memory: any, promptTemplate: any);
}

let endpont = new sagemaker.Endpoint("chatbot-endpoint", "");

let tableName = "conversations";
let partitionKey = "Id";
let table = new dynamodb.Table(
  name: tableName,
  attributes: [
    {
      name: partitionKey,
      type: "S",
    },
  ],
  hashKey: partitionKey,
);

let api = new cloud.Api();

let chat = inflight(sessionId: str, query: str) => {
  let memory = LangChainFactory.createMemory(tableName, partitionKey, sessionId);
  let model = LangChainFactory.createModel(endpont.endpointName);
  let promptTemplate = LangChainFactory.createPromptTemplate();
  let llmChain = LangChainFactory.createConversationChain(model, memory, promptTemplate);

  let result = llmChain.invoke({ query: query });
  return result.response;
};

api.get("/chat", inflight (request: cloud.ApiRequest): cloud.ApiResponse => {
  let sessionId = request.query.get("session_id");
  let query = request.query.get("query");

  if (sessionId == "" || query == "") {
    return {
      status: 400,
      body: "Both sessionid and query are required.",
    };
  }

  let result = chat(sessionId, query);
  return {
    status: 200,
    body: result,
  };
});

