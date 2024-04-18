from typing import Any
from .lib import tool

def handler():
    tool()
    __handle_: Any = globals().get("__handle_")
    __handle_()