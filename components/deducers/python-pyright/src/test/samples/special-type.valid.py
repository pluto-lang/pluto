from pluto_client import Queue


# Directly instantiate the resource object.
queue = Queue("queue")


# Indirectly instantiate the resource object.
AliasQueue = Queue
queue2 = AliasQueue("queue2")


def createQueue(queueName: str):
    return Queue(queueName)


# Instantiate the resource object with a factory function.
queue3 = createQueue("queue3")


# Directly invoke the resource method.
queue.subscribe(lambda x: print(x))


# Invoke the resource method on a constructor's return value.
Queue("queue4").subscribe(lambda x: print(x))
AliasQueue("queue5").subscribe(lambda x: print(x))


# Invoke the resource method on a factory function's return value.
createQueue("queue4").subscribe(lambda x: print(x))
