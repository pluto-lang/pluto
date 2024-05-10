import os
import re
import sys
import logging

from pluto_client import FunctionOptions, Function, Bucket, Schedule

from langchain_core.pydantic_v1 import SecretStr
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores.faiss import FAISS
from langchain_text_splitters import MarkdownTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.document_loaders.github import GithubFileLoader

from mangum import Mangum
from fastapi import FastAPI
from urllib.parse import urlencode
from pydantic import BaseModel, Field
from fastui.events import PageEvent, GoToEvent
from fastui import prebuilt_html, FastUI, AnyComponent, components as c
from starlette.responses import Response, HTMLResponse

# ====== Configuration ======
# 1. The OpenAI API key is used to access the OpenAI Embeddings and ChatGPT API. You can get the API
# key from https://platform.openai.com/account/api-keys
# 2. The GitHub Access Key is used to fetch the documents from the GitHub repository. You can create
# a personal access token from https://github.com/settings/tokens

PROJECT_NAME = "Pluto"
REPO = "pluto-lang/website"
BRANCH = "main"
DOC_RELATIVE_PATH = "pages"
OPENAI_BASE_URL = "https://api.openai.com/v1"
OPENAI_API_KEY = "<replace_with_your_openai_api_key>"
GITHUB_ACCESS_KEY = "<replace_with_your_github_access_key>"
# ===========================


FAISS_INDEX = "index"
PKL_KEY = f"{FAISS_INDEX}.pkl"
FAISS_KEY = f"{FAISS_INDEX}.faiss"

embeddings = OpenAIEmbeddings(
    base_url=OPENAI_BASE_URL, api_key=SecretStr(OPENAI_API_KEY)
)

vector_store_bucket = Bucket("vector-store")


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
    if not os.path.exists(vector_store_dir + f"/{PKL_KEY}"):
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


def format_docs(docs):
    print("Retrieved docs:", len(docs))
    return "\n\n".join(doc.page_content for doc in docs)


# Leaving the following variable outside the handler function will allow them to be reused across
# multiple invocations of the function.
retriever = build_retriever()

# Create the prompt template in accordance with the structure provided in the Llama3 documentation,
# which can be found at https://llama.meta.com/docs/model-cards-and-prompt-formats/meta-llama-3/
prompt = PromptTemplate.from_template(
    """As an adaptable question-answering assistant, your role is to leverage the provided context to address user inquiries. When direct answers are not apparent from the context, you are encouraged to draw upon analogies or related knowledge to formulate or infer solutions. If a certain answer remains elusive, politely acknowledge the limitation. Aim for concise responses, ideally within three sentences. In response to requests for links, explain that link provision is not supported.

Context: {context}

Question: {question}"""
)


llm = ChatOpenAI(
    model="gpt-3.5-turbo",
    base_url=OPENAI_BASE_URL,
    api_key=SecretStr(OPENAI_API_KEY),
)

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)


def return_fastapi_app():
    app = FastAPI()

    class ChatForm(BaseModel):
        chat: str = Field(
            title="Question:",
            max_length=1000,
            description="Enter your question in the box above.",
        )

    # Root endpoint
    @app.get("/api", response_model=FastUI, response_model_exclude_none=True)
    def api_index(chat: str | None = None) -> list[AnyComponent]:
        param = urlencode({"query": chat})
        return [
            c.PageTitle(text="QA Bot For " + PROJECT_NAME),
            c.Page(
                components=[
                    # Header
                    c.Heading(text="QA Bot For " + PROJECT_NAME),
                    c.Markdown(
                        text="This is a simple QA Bot built with FastUI, OpenAI and Pluto, and deployed on AWS. You can easily build a similar bot for your project by following [this tutorial](https://pluto-lang.vercel.app/cookbook/rag-qa-bot-with-web)."
                    ),
                    # Chat form
                    c.ModelForm(model=ChatForm, submit_url=".", method="GOTO"),
                    # Chatbot response
                    c.Markdown(text="**Answer:**", class_name="mt-5"),
                    c.Div(
                        components=[
                            c.ServerLoad(
                                path=f"/query?{param}",
                                load_trigger=PageEvent(name="load"),
                                components=[],
                            ),
                        ],
                        class_name="p-2 border rounded",
                    ),
                ],
            ),
            # Footer
            c.Footer(
                links=[
                    c.Link(
                        components=[
                            c.Paragraph(
                                text="Powered by Pluto | We'd appreciate it if you could give us a star 🌟"
                            ),
                            c.Paragraph(text="https://github.com/pluto-lang/pluto"),
                        ],
                        on_click=GoToEvent(url="https://github.com/pluto-lang/pluto"),
                    )
                ],
            ),
        ]

    @app.get("/api/query")
    def ai_response(query: str) -> Response:
        # Check if prompt is empty
        if query is None or query == "" or query == "None":
            m = FastUI(root=[c.Markdown(text="")])
            return Response(m.model_dump_json(by_alias=True, exclude_none=True))

        response = rag_chain.invoke(query)
        m = FastUI(root=[c.Markdown(text=response)])
        return Response(m.model_dump_json(by_alias=True, exclude_none=True))

    # Prebuilt HTML
    @app.get("/")
    async def html_landing() -> HTMLResponse:
        """Simple HTML page which serves the React app, comes last as it matches all paths."""
        return HTMLResponse(prebuilt_html(title="QA Bot Powered by Pluto"))

    return app


app = return_fastapi_app()


def raw_handler(*args, **kwargs):
    handler = Mangum(app)
    return handler(*args, **kwargs)


schd = Schedule("qa_schedule")
schd.cron("0 0 * * *", flush_vector_store)

# This application requires a minimum of 256MB memory to run.
Function(raw_handler, name="qa_query", options=FunctionOptions(memory=512, raw=True))
