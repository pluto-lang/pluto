import os
from typing import Any


class UniversalClass:
    def __getattr__(self, name: str):
        class MethodCaller:
            def __call__(self, *args: Any, **kwargs: Any):
                if os.getenv("DEBUG", False):
                    print(f"Method called: {name}")
                return None
        return MethodCaller()