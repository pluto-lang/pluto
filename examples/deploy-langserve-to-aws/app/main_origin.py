from fastapi import FastAPI
from langchain.prompts import ChatPromptTemplate

# from langchain.chat_models import ChatAnthropic, ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain.pydantic_v1 import SecretStr

OPENAI_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")
ANTHROPIC_API_KEY = SecretStr("sk-EUk0Tal8cIkmG4vJF904F57a9eE241A8Ae72666fAxxxxxxx")

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

model = ChatAnthropic(api_key=ANTHROPIC_API_KEY)
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")
add_routes(
    app,
    prompt | model,
    path="/joke",
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)
