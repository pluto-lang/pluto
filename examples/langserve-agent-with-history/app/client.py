from langserve import RemoteRunnable
from langchain_core.messages import HumanMessage, AIMessage

remote_runnable = RemoteRunnable(
    "https://<api>.execute-api.us-east-1.amazonaws.com/dev"  # Replace with your API Gateway URL
)


async def main():
    chat_history = []

    while True:
        human = input("Human (Q/q to quit): ")
        if human in {"q", "Q"}:
            print("AI: Bye bye human")
            break
        ai = await remote_runnable.ainvoke(
            {"input": human, "chat_history": chat_history}
        )
        print(f"AI: {ai['output']}")
        chat_history.extend(
            [HumanMessage(content=human), AIMessage(content=ai["output"])]
        )


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
