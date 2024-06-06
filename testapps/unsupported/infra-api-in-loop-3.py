from pluto_client import KVStore, Router


class LLM:
    def __init__(self, model: str, memory: KVStore, info: str):
        self.model = model
        self.memory = memory
        self.info = info

    def invoke(self, question: str):
        ans = f"Answer for {question} by {self.model}"
        self.memory.set(question, ans)
        return ans


def add_routes(router: Router, model: str, llm: LLM):
    def invoke_handler(req):
        question = req.query.get("question")
        return llm.invoke(question)

    # Here, we don't care about the state storage of LLM. Assume that the memory and other state
    # storage of LLM have been set to external storage instances such as KV databases when creating
    router.get(f"/{model}/info", lambda x: llm.info)
    router.get(f"/{model}/invoke", invoke_handler)

    # Forbidden behavior below, as it actually accesses runtime variables at compile time
    # llm.invoke("Hi")
    # router.get(f"/{llm["model"]}/info", lambda x: x["info"])


router = Router("router")
llm = LLM("basic", KVStore("memory"), "LLM Info")
add_routes(router, "basic", llm)


llms = []
for model in ["openai", "antrophic"]:
    llm = {
        "memory": KVStore(f"memory_{model}"),
        "info": f"LLM Info {model}",
        "model": model,
    }
    llms.append(llm)
    add_routes(router, model, llm)
