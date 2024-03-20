import json
from datetime import datetime
from pluto_client import KVStore, Queue, Router, HttpRequest, HttpResponse, CloudEvent


router = Router("router")
kvstore = KVStore("kvstore")
queue = Queue("queue")


def hello_handler(req: HttpRequest) -> HttpResponse:
    name = req.query["name"] if "name" in req.query else "Anonym"
    if isinstance(name, list):
        name = ",".join(name)
    message = f"{name} access at {int(datetime.now().timestamp() * 1000)}"
    queue.push(json.dumps({"name": name, "message": message}))
    return HttpResponse(status_code=200, body=f"Publish a message: {message}.")


def store_handler(req: HttpRequest) -> HttpResponse:
    name = req.query["name"] if "name" in req.query else "Anonym"
    if isinstance(name, list):
        name = ",".join(name)
    message = kvstore.get(str(name))
    return HttpResponse(
        status_code=200, body=f"Fetch {name} access message: {message}."
    )


def handle_queue_event(evt: CloudEvent):
    data = json.loads(evt.data)
    print(data)
    kvstore.set(data["name"], data["message"])


router.get("/hello", hello_handler)
router.get("/store", store_handler)
queue.subscribe(handle_queue_event)
