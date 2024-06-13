import json
import time
import requests
from pluto_client import (
    HttpResponse,
    Tester,
    Queue,
    KVStore,
    Router,
    Function,
    CloudEvent,
    HttpRequest,
)


"""
The following section is testing the KVStore and Queue.
"""

kvstore = KVStore("kvstore")
queue = Queue("queue")


# Subscribe to messages in the queue and store them in the KV database.
def subscribe_handler(evt: CloudEvent):
    data = json.loads(evt.data)
    kvstore.set(data["name"], data["message"])


queue.subscribe(subscribe_handler)


def queue_test_handler():
    queue.push(json.dumps({"name": "pluto", "message": "test"}))
    # It's possible that the message is not yet stored, even after it has been returned.
    time.sleep(10)
    val = kvstore.get("pluto")
    if val != "test":
        raise Exception("The 'val' didn't meet expectations.")


queueTester = Tester("queueTester")
queueTester.it("push a message to the queue", queue_test_handler)


"""
The subsequent section conducts tests on the Router, which includes accessing properties via
router.url(), and making direct HTTP requests to the router.
"""


def hello_handler(req: HttpRequest):
    return HttpResponse(status_code=200, body="Hello, Pluto")


router = Router("router")
router.get("/hello", hello_handler)


def router_test_handler_url():
    # TODO: In the simulation, all method no matter what they are, are async. Because all methods are
    # invoked via RPC. We need to discover if there is a way can invoke sync method synchronously.
    url = router.url()
    if not url.startswith("http"):
        raise Exception("the url is not valid.")


def router_test_handler_hello():
    url = router.url()
    res = requests.get(f"{url}/hello")
    if res.text != "Hello, Pluto":
        raise Exception("The response body is not as expected")


routerTester = Tester("routerTester")
routerTester.it("access the router url", router_test_handler_url)
routerTester.it("GET /hello, responds with Hello, Pluto", router_test_handler_hello)


"""
The following section tests the Function class.
"""


def echo_function(input: str):
    return input


echoFunction = Function(echo_function, "echoFunction")


def function_test_handler():
    res = echoFunction.invoke("hello")
    if res != "hello":
        raise Exception("The return value is not as expected.")


functionTester = Tester("functionTester")
functionTester.it("invoke the echo function", function_test_handler)
