import os
import json
from typing import Dict

from langchain.prompts import PromptTemplate
from langchain.memory.buffer import ConversationBufferMemory
from langchain.chains.conversation.base import ConversationChain
from langchain_community.chat_message_histories.dynamodb import (
    DynamoDBChatMessageHistory,
)
from langchain_community.llms.sagemaker_endpoint import (
    SagemakerEndpoint,
    LLMContentHandler,
)

ENDPOINT_NAME = "llama2"
TABLE_NAME = "conversations"
PARTITION_KEY = "Id"


class ContentHandler(LLMContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompt: str, model_kwargs: Dict) -> bytes:
        input_str = json.dumps({"inputs": prompt, "parameters": model_kwargs})
        return input_str.encode("utf-8")

    def transform_output(self, output: bytes) -> str:
        raw = output.read()  # type: ignore
        response_json = json.loads(raw.decode("utf-8"))
        content = response_json[0]["generated_text"]
        answerStartPos = content.index("<|assistant|>") + len("<|assistant|>")
        answer = content[answerStartPos:].strip()
        return answer


def get_aws_region() -> str:
    aws_region = os.environ.get("AWS_REGION")
    if aws_region is None:
        raise ValueError("AWS_REGION environment variable must be set")
    return aws_region


llm = SagemakerEndpoint(
    endpoint_name=ENDPOINT_NAME,
    region_name=get_aws_region(),
    content_handler=ContentHandler(),
)


def chat(session_id: str, query: str):
    memory = ConversationBufferMemory(
        chat_memory=DynamoDBChatMessageHistory(
            table_name=TABLE_NAME,  # DynamoDB table name
            primary_key_name=PARTITION_KEY,  # DynamoDB partition key
            session_id=session_id,
        )
    )

    promptTemplate = PromptTemplate.from_template(
        """<|system|>
You are a cool and aloof robot, answering questions very briefly and directly.

Context:
{history}</s>
<|user|>
{input}</s>
<|assistant|>"""
    )

    chain = ConversationChain(
        llm=llm,
        memory=memory,
        prompt=promptTemplate,
    )

    result = chain.predict(input=query)
    return result


def handler(event):
    query = event.query["query"]
    sessionid = event.query["sessionid"]
    if isinstance(sessionid, list):
        sessionid = sessionid[0]
    if isinstance(query, list):
        query = query[0]

    if (sessionid is None) or (query is None):
        return {
            "statusCode": 400,
            "body": "sessionid and query are required parameters",
        }

    result = chat(sessionid, query)
    return {
        "statusCode": 200,
        "body": result,
    }
