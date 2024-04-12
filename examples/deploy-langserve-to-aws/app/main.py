from fastapi import FastAPI
from langchain.prompts import ChatPromptTemplate

# from langchain.chat_models import ChatAnthropic, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain.pydantic_v1 import SecretStr

from mangum import Mangum
from pluto_client import Router

OPENAI_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")
ANTHROPIC_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")

model = ChatAnthropic(api_key=ANTHROPIC_API_KEY)
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")


def return_fastapi_app():
    # The langserve depends on this, but it may not come pre-installed.
    # So, we write it here to ensure it is installed.
    import sse_starlette

    app = FastAPI(
        title="LangChain Server",
        version="1.0",
        description="A simple api server using Langchain's Runnable interfaces",
    )

    add_routes(
        app,
        ChatOpenAI(api_key=OPENAI_API_KEY),
        path="/openai",
    )

    add_routes(
        app,
        ChatAnthropic(api_key=ANTHROPIC_API_KEY),
        path="/anthropic",
    )

    add_routes(
        app,
        prompt | model,
        path="/dev/joke",
    )

    # The routes below are for getting the Playground to work.
    add_routes(
        app,
        ChatOpenAI(api_key=OPENAI_API_KEY),
        path="/dev/openai",
    )

    add_routes(
        app,
        ChatAnthropic(api_key=ANTHROPIC_API_KEY),
        path="/dev/anthropic",
    )

    add_routes(
        app,
        prompt | model,
        path="/dev/joke",
    )

    return app


def raw_handler(*args, **kwargs):
    handler = Mangum(return_fastapi_app(), api_gateway_base_path="/dev")
    return handler(*args, **kwargs)


router = Router("router_name")
router.all("/*", raw_handler, raw=True)
