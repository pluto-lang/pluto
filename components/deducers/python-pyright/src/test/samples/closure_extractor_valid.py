import json
from datetime import datetime
from dataclasses import dataclass
from typing import Callable

import pluto_client
import pluto_client as pluto_client_alias
from pluto_client import (
    HttpRequest,
    Function as PlutoFunction,
    FunctionOptions,
)
from pluto_client.router import HttpResponse

queueName = "test-queue"
queue = pluto_client.Queue(queueName)  # resource object construction
router = pluto_client_alias.Router("test-router")  # resource object construction


@dataclass
class Base:
    id: str


class Model(Base):
    name: str
    age: int

    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age


const_num = 10


def func(a: int, b: Callable[[int], int], c: Callable[[int], int]):
    model = Model("name", 1)  # class dependency
    print(router.url())  # invoke client method
    return a + const_num  # variable dependency


def echo(x):
    return x


var_from_call = func(1, lambda x: x, echo)


def get_handler(req: HttpRequest) -> pluto_client_alias.HttpResponse:
    print(var_from_call)  # variable dependency
    func(1, echo, lambda x: x)  # nested function dependency
    name = req.query["name"] if "name" in req.query else "Anonym"
    if isinstance(name, list):
        name = ",".join(name)
    message = f"{name} access at {int(datetime.now().timestamp() * 1000)}"
    queue.push(json.dumps({"name": name, "message": message}))  # invoke client method
    return pluto_client_alias.HttpResponse(
        status_code=200, body=f"Publish a message: {message}."
    )


func_obj = PlutoFunction(
    func, FunctionOptions(name="func")
)  # resource object construction with options


def returnHandler(path: str):
    def handler(req: HttpRequest) -> pluto_client_alias.HttpResponse:
        func_obj.invoke(1)
        return pluto_client_alias.HttpResponse(status_code=200, body=f"Path: {path}")

    return handler


# infrastructure method invocations
router.get("/get", get_handler)  # function variable
router.post(
    "/post", lambda x: HttpResponse(status_code=200, body="Post")  # lambda expression
)
router.put("/put", returnHandler("put"))  # function closure
