import asyncio

from langchain.schema import SystemMessage, HumanMessage
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableMap
from langserve import RemoteRunnable


openai = RemoteRunnable(
    "https://fcz1u130w3.execute-api.us-east-1.amazonaws.com/dev/openai/"
)
joke_chain = RemoteRunnable(
    "https://fcz1u130w3.execute-api.us-east-1.amazonaws.com/dev/joke/"
)


def sync_inoke():
    result = joke_chain.invoke({"topic": "parrots"})
    print(
        ">> The result of `joke_chain.invoke({'topic': 'parrots'})` is:\n",
        result.content,
        "\n",
    )


async def async_inoke():
    result = await joke_chain.ainvoke({"topic": "parrots"})
    print(
        ">> The result of `await joke_chain.ainvoke({'topic': 'parrots'})` is:\n",
        result.content,
        "\n",
    )

    prompt = [
        SystemMessage(content="Act like either a cat or a parrot."),
        HumanMessage(content="Hello!"),
    ]

    # Supports astream
    print(">> The result of `openai.astream(prompt)` is:")
    async for msg in openai.astream(prompt):
        print(msg.content, end=" | ", flush=True)
    print()


def custom_chain():
    prompt = ChatPromptTemplate.from_messages(
        [("system", "Tell me a long story about {topic}")]
    )

    # Can define custom chains
    chain = prompt | RunnableMap(
        {
            "openai": openai,
            "anthropic": openai,
        }
    )

    result = chain.batch([{"topic": "parrots"}, {"topic": "cats"}])
    print(
        ">> The result of `chain.batch([{'topic': 'parrots'}, {'topic': 'cats'}])` is:\n",
        result,
    )


async def main():
    sync_inoke()
    await async_inoke()
    custom_chain()


asyncio.run(main())
