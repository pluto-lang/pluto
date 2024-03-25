# Not working. Related issue: https://github.com/leptonai/leptonai/issues/354
import os
import json
from typing import List, Optional, Any

import torch
from transformers import pipeline, Pipeline

from leptonai.kv import KV
from leptonai.photon import Photon
from langchain_core.chat_history import BaseChatMessageHistory

from langchain_core.messages import (
    BaseMessage,
    message_to_dict,
    messages_from_dict,
    messages_to_dict,
)
from langchain.prompts import PromptTemplate
from langchain_core.language_models import LLM
from langchain.memory.buffer import ConversationBufferMemory
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_community.llms.utils import enforce_stop_tokens
from langchain.chains.conversation.base import ConversationChain


_KV_NAMESPACE = "lepton-chatbot"


class LeptonMessageHistory(BaseChatMessageHistory):
    def __init__(self, namespace: str, session_id: str):
        self.kv = KV(namespace, create_if_not_exists=True, wait_for_creation=True)
        self.session_id = session_id

    def add_message(self, message: BaseMessage) -> None:
        messages = messages_to_dict(self.messages)
        _message = message_to_dict(message)
        messages.append(_message)
        self.kv.put(self.session_id, json.dumps(messages))

    @property
    def messages(self) -> List[BaseMessage]:  # type: ignore
        messages = []
        try:
            data = self.kv.get(self.session_id)
            messages = json.loads(data)
        except:
            messages = []
        return messages_from_dict(messages)

    def clear(self):
        self.kv.delete(self.session_id)


class LeptonLLM(LLM):

    pipeline: Pipeline

    @property
    def _llm_type(self):
        return "lepton"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        res = self.pipeline(prompt)

        text = str(self._get_generated_text(res))

        if stop is not None:
            text = enforce_stop_tokens(text, stop)

        return text

    def _get_generated_text(self, res):
        if isinstance(res, str):
            return res
        elif isinstance(res, dict):
            return res["generated_text"]
        elif isinstance(res, list):
            if len(res) == 1:
                return self._get_generated_text(res[0])
            else:
                return [self._get_generated_text(r) for r in res]
        else:
            raise ValueError(
                f"Unsupported result type in _get_generated_text: {type(res)}"
            )


class Llama2(Photon):
    requirement_dependency = [
        "git+https://github.com/huggingface/transformers.git@015f8e1",
        "accelerate",
        "langchain",
    ]

    def init(self):
        if torch.cuda.is_available():
            device = 0
        else:
            device = -1

        self.pipeline = pipeline(
            "text-generation",
            model=os.environ.get("MODEL", "meta-llama/Llama-2-7b-chat-hf"),
            torch_dtype=torch.float16,
            device=device,
        )

        print(self.pipeline is None)

    @Photon.handler(
        "chat",
        example={
            "session_id": "session_id",
            "query": "What is the capital of France?",
        },
    )
    def chat(self, session_id: str, query: str):
        llm = LeptonLLM(pipeline=self.pipeline)

        memory = ConversationBufferMemory(
            chat_memory=LeptonMessageHistory(
                namespace=_KV_NAMESPACE, session_id=session_id
            )
        )

        promptTemplate = PromptTemplate.from_template(
            """<|system|>
  You are a cool and aloof robot, answering questions very briefly and directly.

  Context:
  {history}</s>
  <|user|>
  {query}</s>
  <|assistant|>"""
        )

        chain = ConversationChain(
            llm=llm,
            memory=memory,
            prompt=promptTemplate,
        )

        result = chain({"query": query})
        print(result)


if __name__ == "__main__":
    p = Llama2()
    p.launch()
