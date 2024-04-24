import os
import re
import sys
import json
import logging
from typing import Dict

from pluto_client import FunctionOptions, Function, Bucket, Schedule
from pluto_client.sagemaker import SageMaker, SageMakerOptions

from langchain_openai import OpenAIEmbeddings
from langchain_core.pydantic_v1 import SecretStr
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores.faiss import FAISS
from langchain_text_splitters import MarkdownTextSplitter
from langchain_community.document_loaders.github import GithubFileLoader
from langchain_community.llms.sagemaker_endpoint import (
    SagemakerEndpoint,
    LLMContentHandler,
)


# ====== Configuration ======
# 1. The OpenAI API key is used to access the OpenAI Embeddings API. You can get the API key from
# https://platform.openai.com/account/api-keys
# 2. The GitHub Access Key is used to fetch the documents from the GitHub repository. You can create
# a personal access token from https://github.com/settings/tokens
# 3. The Hugging Face Hub token is used to download the model from the Hugging Face Hub when
# deploying the model on AWS SageMaker. You can get the token from
# https://huggingface.co/settings/tokens

REPO = "pluto-lang/website"
BRANCH = "main"
DOC_RELATIVE_PATH = "pages"
OPENAI_BASE_URL = "https://api.openai.com/v1"
OPENAI_API_KEY = "<replace_with_your_openai_api_key>"
GITHUB_ACCESS_KEY = "<replace_with_your_github_access_key>"
HUGGING_FACE_HUB_TOKEN = "<replace_with_your_hugging_face_hub_token>"
# ===========================


FAISS_INDEX = "index"
PKL_KEY = f"{FAISS_INDEX}.pkl"
FAISS_KEY = f"{FAISS_INDEX}.faiss"

embeddings = OpenAIEmbeddings(
    base_url=OPENAI_BASE_URL, api_key=SecretStr(OPENAI_API_KEY)
)

vector_store_bucket = Bucket("vector-store")

"""
Deploy the Llama3 model on AWS SageMaker using the Hugging Face Text Generation Inference (TGI)
container. If you're unable to deploy the model because of the instance type, consider using the 
TinyLlama-1.1B-Chat-v1.0 model, which is compatible with the ml.m5.xlarge instance.

Below is a set up minimum requirements for each model size of Llama3 model:
```
Model      Instance Type      # of GPUs per replica
Llama 8B   ml.g5.2xlarge      1
Llama 70B  ml.p4d.24xlarge    8
```

The initial limit set for these instances is zero. If you need more, you can request an increase
in quota via the [AWS Management Console](https://console.aws.amazon.com/servicequotas/home).
"""
sagemaker = SageMaker(
    "llama3-model",
    "763104351884.dkr.ecr.us-east-1.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi2.0.0-gpu-py310-cu121-ubuntu22.04-v2.0",
    SageMakerOptions(
        instanceType="ml.g5.2xlarge",
        envs={
            "HF_MODEL_ID": "meta-llama/Meta-Llama-3-8B-Instruct",
            "HF_TASK": "text-generation",
            "MAX_TOTAL_TOKENS": "8096",
            # If you want to deploy the Meta Llama3 model, you need to request a permission and
            # prepare the token. You can get the token from https://huggingface.co/settings/tokens
            "HUGGING_FACE_HUB_TOKEN": HUGGING_FACE_HUB_TOKEN,
        },
    ),
)


class ContentHandler(LLMContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompt: str, model_kwargs: Dict) -> bytes:
        if "stop" not in model_kwargs:
            model_kwargs["stop"] = ["<|eot_id|>"]
        elif "<|eot_id|>" not in model_kwargs["stop"]:
            model_kwargs["stop"].append("<|eot_id|>")

        input_str = json.dumps({"inputs": prompt, "parameters": model_kwargs})
        return input_str.encode("utf-8")

    def transform_output(self, output: bytes) -> str:
        raw = output.read()  # type: ignore
        response_json = json.loads(raw.decode("utf-8"))
        content = response_json[0]["generated_text"]

        assistant_beg_flag = "assistant<|end_header_id|>"
        answerStartPos = content.index(assistant_beg_flag) + len(assistant_beg_flag)
        answer = content[answerStartPos:].strip()
        return answer


def build_logger():
    logger = logging.getLogger(__name__)
    logger.setLevel(logging.INFO)
    # Create a console handler
    handler = logging.StreamHandler()
    handler.flush = sys.stdout.flush
    handler.setLevel(logging.INFO)
    # Create a formatter and add it to the handler
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    handler.setFormatter(formatter)
    # Add the handler to the logger
    logger.addHandler(handler)
    return logger


logger = build_logger()


def create_vector_store() -> FAISS | None:
    # Explicitly import Faiss to alert Pluto that this function relies on it, ensuring the inclusion
    # of the Faiss package in the deployment bundle.
    import faiss

    def file_filter(file_path):
        return re.match(f"{DOC_RELATIVE_PATH}/.*\\.mdx?", file_path) is not None

    loader = GithubFileLoader(
        repo=REPO,
        branch=BRANCH,
        access_token=GITHUB_ACCESS_KEY,
        github_api_url="https://api.github.com",
        file_filter=file_filter,
    )
    docs = loader.load()

    if len(docs) == 0:
        logger.info("No documents updated")
        return
    logger.info(f"Loaded {len(docs)} documents")

    for doc in docs:
        doc.metadata["source"] = str(doc.metadata["source"])

    logger.info(f"Starting to split documents")
    text_splitter = MarkdownTextSplitter(chunk_size=2000, chunk_overlap=200)
    splits = text_splitter.split_documents(docs)

    logger.info(f"Starting to create vector store")
    store = FAISS.from_documents(splits, embeddings)
    logger.info(f"Finished creating vector store")

    return store


def download_vector_store(vector_store_dir: str):
    ensure_dir(vector_store_dir)
    vector_store_bucket.get(PKL_KEY, os.path.join(vector_store_dir, PKL_KEY))
    vector_store_bucket.get(FAISS_KEY, os.path.join(vector_store_dir, FAISS_KEY))


def flush_vector_store(vector_store_dir: str = "/tmp/vector_store"):
    vector_store = create_vector_store()
    if vector_store is None:
        return

    ensure_dir(vector_store_dir)
    vector_store.save_local(vector_store_dir, index_name=FAISS_INDEX)
    vector_store_bucket.put(PKL_KEY, os.path.join(vector_store_dir, PKL_KEY))
    vector_store_bucket.put(FAISS_KEY, os.path.join(vector_store_dir, FAISS_KEY))


def build_retriever():
    vector_store_dir = "/tmp/vector_store"
    if not os.path.exists(vector_store_dir):
        try:
            logger.info("Vector store not found, downloading...")
            download_vector_store(vector_store_dir)
        except Exception as e:
            logger.error(f"Failed to download vector store: {e}")
            flush_vector_store(vector_store_dir)

    logger.info("Loading vector store")
    vectorstore = FAISS.load_local(
        vector_store_dir, embeddings, allow_dangerous_deserialization=True
    )
    logger.info("Vector store loaded")
    return vectorstore.as_retriever()


def ensure_dir(dir: str):
    if not os.path.exists(dir):
        os.makedirs(dir)


def get_aws_region() -> str:
    aws_region = os.environ.get("AWS_REGION")
    if aws_region is None:
        raise ValueError("AWS_REGION environment variable must be set")
    return aws_region


# Leaving the following variable outside the handler function will allow them to be reused across
# multiple invocations of the function.
retriever = build_retriever()

# Create the prompt template in accordance with the structure provided in the Llama3 documentation,
# which can be found at https://llama.meta.com/docs/model-cards-and-prompt-formats/meta-llama-3/
prompt = PromptTemplate.from_template(
    """<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise. In case the query requests a link, respond that you don't support links.
Context: {context}<|eot_id|><|start_header_id|>user<|end_header_id|>

{question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"""
)

llm = SagemakerEndpoint(
    endpoint_name=sagemaker.endpoint_name,  # SageMaker endpoint name
    region_name=get_aws_region(),
    content_handler=ContentHandler(),
    model_kwargs={
        "max_new_tokens": 512,
        "do_sample": True,
        "temperature": 0.6,
        "top_p": 0.9,
    },
)


def query(query):
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain.invoke(query)
    # The line below serves as a notification to Pluto that the function will trigger SageMaker
    # endpoint. So, Pluto will set the appropriate permissions for the function.
    sagemaker.invoke("")


schd = Schedule("schedule")
schd.cron("0 0 * * *", flush_vector_store)

# This application requires a minimum of 256MB memory to run.
Function(query, FunctionOptions(name="query", memory=512))
