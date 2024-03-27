import os
import json
from typing import Dict

from pluto_client.sagemaker import SageMaker, SageMakerOptions
from pluto_client import Router, HttpRequest, HttpResponse, KVStore

# TODO: The initial import of langchain will take about 50 seconds.
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

"""
Deploy the Llama2 model on AWS SageMaker using the Hugging Face Text Generation Inference (TGI)
container. If you're unable to deploy the model because of the instance type, consider using the 
TinyLlama-1.1B-Chat-v1.0 model, which is compatible with the ml.m5.xlarge instance.

Below is a set up minimum requirements for each model size of Llama2 model:
```
Model      Instance Type    Quantization    # of GPUs per replica
Llama 7B   ml.g5.2xlarge    -               1
Llama 13B  ml.g5.12xlarge   -               4
Llama 70B  ml.g5.48xlarge   bitsandbytes    8
Llama 70B  ml.p4d.24xlarge  -               8
```

The initial limit set for these instances is zero. If you need more, you can request an increase
in quota via the [AWS Management Console](https://console.aws.amazon.com/servicequotas/home).
"""
sagemaker = SageMaker(
    "llama2",
    "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu20.04",
    SageMakerOptions(
        instanceType="ml.g5.2xlarge",
        envs={
            "HF_MODEL_ID": "meta-llama/Llama-2-7b-chat-hf",
            "HF_TASK": "text-generation",
            # If you want to deploy the Meta Llama2 model, you need to request a permission and
            # prepare the token. You can get the token from https://huggingface.co/settings/tokens
            "HUGGING_FACE_HUB_TOKEN": "hf_EmXPwpnyHoNrxxxxxxxxx",
        },
    ),
)

router = Router("chatbot")
conversations = KVStore("conversations")


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
    endpoint_name=sagemaker.endpoint_name,  # SageMaker endpoint name
    region_name=get_aws_region(),
    content_handler=ContentHandler(),
)


def chat(session_id: str, query: str):
    memory = ConversationBufferMemory(
        chat_memory=DynamoDBChatMessageHistory(
            table_name=conversations.aws_table_name,  # DynamoDB table name
            primary_key_name=conversations.aws_partition_key,  # DynamoDB partition key
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

    # TODO: Use the following statement to help the deducer identify the right relationship between
    # Lambda and other resources. This will be used to grant permission for the Lambda instance to
    # access the SageMaker endpoint and the DynamoDB. This code should be removed after the deducer
    # supports the analysis of libraries.
    conversations.get("")
    conversations.set("", "")
    sagemaker.invoke("")


def chat_handler(req: HttpRequest) -> HttpResponse:
    query = req.query["query"]
    sessionid = req.query["sessionid"]
    if isinstance(sessionid, list):
        sessionid = sessionid[0]
    if isinstance(query, list):
        query = query[0]

    if (sessionid is None) or (query is None):
        return HttpResponse(status_code=400, body="sessionid and query are required")

    result = chat(sessionid, query)
    return HttpResponse(status_code=200, body=result)


router.get("/chatbot", chat_handler)
