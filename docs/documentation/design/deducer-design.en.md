---
title: Deducer Requirements and Design
date: 2024-02-05
---

# Deducer Requirements and Design

This document provides a detailed description of the functional requirements and implementation strategies for Deducer, without being tied to any specific language.

## Functional Requirements

Deducer focuses on a special type of instantiated objects (referred to as "special objects"), monitoring the instantiation process (i.e., the invocation of constructors) of special types, as well as the invocation of special methods by special objects. Specifically, it tracks the arguments passed during each invocation of the constructor and special methods. If the corresponding argument type in the function definition is a function type, it needs to be extracted as a computational closure; otherwise, its specific value needs to be deduced. An error can be reported if the deduction or extraction fails.

- **Root Type**: This refers to a set of special interfaces defined by Pluto in the Base SDK, with different interfaces having different meanings and effects. These root interfaces are the fundamental basis for Deducer to determine whether an object or method needs special attention. For example, in the example below, `base.IResource`, `base.IResourceClientApi`, `base.IResourceInfraApi`, and `base.IResourceCapturedProps` are all root types, where `base.IResource` is used to indicate that its subclasses or interfaces are cloud resource types; `base.IResourceClientApi` indicates that the methods in its subclasses or interfaces are functional methods of cloud resource instances, accessible at runtime; `base.IResourceInfraApi` is used to indicate that the methods in its subclasses or interfaces are methods that need to be executed during deployment, used to construct cloud resource instances and relationships; `base.IResourceCapturedProps` is used to indicate that the methods in its subclasses or interfaces are cloud resource properties, and the specific values of these properties are generated at deployment time. If interested, you can read [this document](./capture-value.en.md).
- **Special Type**: Refers to a class or interface that implements or extends a root type. For example, in the example below, `resource.Queue` extends the root type `base.IResource`, so `resource.Queue` is a special type.
- **Special Method**: Refers to the methods contained in a class or interface that implements or extends a root type. For example, in the example below, `resource.IQueueClientApi`, `resource.IQueueInfraApi`, and `resource.IQueueCapturedProps` each extend the root types `base.IResourceClientApi`, `base.IResourceInfraApi`, and `base.IResourceCapturedProps`, respectively, and the methods contained in these three interfaces are all special methods. It should be noted that a method is only considered a special method when it is invoked by a special type; otherwise, it is considered a normal method. For example, the `push`, `subscribe`, and `id` methods in the example are considered special methods only when they are called as methods of the `resource.Queue` type.
- **Special Object**: An instantiated object of a special type.

By implementing special types and special methods, platform capabilities can be provided to the user's business programming interface, that is, exposing platform capabilities to users in a user-friendly manner. For example, when a user creates an object of type `resource.Queue` in the program code, an AWS SNS instance or a Redis Deployment in a K8s cluster can be automatically created during deployment. The implementation process of special types and special methods usually exists in the [Pluto mode SDK](../concepts/sdk.en.md), and the specific extension process can refer to [this document](../../dev_guide/extend-sdk.en.md).

TypeScript example:

```typescript
// base package
interface IResource {}
interface IResourceClientApi {}
interface IResourceInfraApi {}
interface IResourceCapturedProps {}

// resource package
interface IQueueClientApi extends base.IResourceClientApi {
  push(message: string): Promise<void>; // special method
}

interface IQueueInfraApi extends base.IResourceInfraApi {
  subscribe(handler: Function): void; // special method
}

interface IQueueCapturedProps extends base.IResourceCapturedProps {
  id(): string; // special method
}

// following interface is a special type
interface Queue extends base.IResource, IQueueClientApi, IQueueInfraApi, IQueueCapturedProps {}
```

Python example:

```python
# base module
class IResource(ABC):
    pass


class IResourceClientApi(ABC):
    pass


class IResourceInfraApi(ABC):
    pass


class IResourceCapturedProps(ABC):
    pass


# resource module
class IQueueClientApi(ABC, base.IResourceClientApi):
    @abstractmethod
    def push(message: str) -> None:  # special method
        pass


class IQueueInfraApi(ABC, base.IResourceInfraApi):
    @abstractmethod
    def subscribe(handler: Callable) -> None:  # special method
        pass


class IQueueCapturedProps(ABC, base.IResourceCapturedProps):
    @abstractmethod
    def id() -> str:  # special method
        pass


# following class is a special type
class Queue(base.IResource, IQueueClientApi, IQueueInfraApi, IQueueCapturedProps):
    def push(message: str) -> None:  # special method
        # do something
        pass

    def subscribe(handler: Callable) -> None:  # special method
        # do something
        pass

    def id() -> str:  # special method
        # do something
        return _id
```

Therefore, Deducer needs to find in the program code: 1) the process of special objects being instantiated (the process of calling the constructor); 2) the process of special objects calling special methods. At the same time, determine the information in these call processes. Since the organization of program code is complex and diverse, these processes may appear in various places, including nested functions, function closures, dependent libraries, etc. Here are a few examples, which are not necessarily fully supported in the implementation, but need to provide user-friendly prompts.

**1) The instantiation process is in the closure**

In the following example, the instantiation process is encapsulated in a function `createAndConfigQueue`, and the parameters of the constructor are given by the arguments of the upper function. The `createAndConfigQueue` function is passed as an argument to the `buildQueue` function and is called within it.

Deducer needs to determine:

1. `new resource.Queue` is called twice, and the parameters passed in the two times are `queue1` and `queue2`, respectively, corresponding to the two special objects `queue1` and `queue2`.

```typescript
function createAndConfigQueue(name: string, options?: ConfigOptions): resource.Queue {
  const queue = new resource.Queue(name, options);
  // do something
  return queue;
}

function buildQueue(queueName: string, buildClosure: Function): resource.Queue {
  return buildClosure(queueName);
}

const queue1 = buildQueue("queue1", createAndConfigQueue);
const queue2 = buildQueue("queue2", createAndConfigQueue);
```

**2) Implicit special object**

In the following example, the return value of the constructor of the special type is not assigned to a variable, but the special method `subscribe` of the return value is directly called.

Deducer needs to determine:

1. `new resource.Queue` is called once, and the parameter is empty, this instantiation process produces a special object;
2. Then the `subscribe` special method of this special object is called, and the parameter passed in this call is a function;
3. Deducer extracts this function as a closure.

```typescript
new resource.Queue().subscribe(async () => {
  console.log("Hello, Pluto!");
});
```

**3) The function argument does the special method call**

In the following example, the special method `push` is called in the function `pushOneMessage`, and the caller is determined based on the function argument.

Deducer needs to determine:

1. `new resource.Queue` is called twice, and the parameters passed in the two times are `queue1` and `queue2`, respectively, corresponding to the two special objects `queue1` and `queue2`.
2. The special method `queue.push` is called once, the caller is the special object `queue1`, and the parameter passed is `"Hello, Pluto!"`.

```typescript
const queue1 = new resource.Queue("queue1");
const queue2 = new resource.Queue("queue2");

function pushOneMessage(queue: resource.Queue, msg: string) {
  queue.push(msg);
}

pushOneMessage(queue1, "Hello, Pluto!");
```

**4) The function argument is the return value of the function**

In the following example, the parameter passed to the constructor of the special type `resource.Queue` is the return value of `getName()`.

Deducer needs to determine:

1. `new resource.Queue` is called once, the parameter passed is `queueName`, and `queue` is a special object.

```typescript
function getName(): string {
  return "queueName";
}

const queue = new resource.Queue(getName());
```

**5) Special method renaming, indirect access**

In the following example, the special method `subscribe` of the special object `queue` is assigned to the function variable subFunc, and then this function variable is called.

Deducer needs to determine:

1. `new resource.Queue` is called once, the parameter passed is `queue`, and `queue` is a special object;
2. The special method `subscribe` is called once, the caller is the special object `queue`, and the parameter passed is a function;
3. Extract this function parameter as a closure.

```typescript
const queue = new resource.Queue("queue");

const subFunc = queue.subscribe.bind(queue);

subFunc(async () => {
  console.log("Hello, Pluto!");
});
```

**6) Dynamic resource object access, indirect access**

In the following example, a JS object `queues` is built, which contains key-value pairs, and the values are all special objects. Subsequently, one of the special objects is accessed by index.

Deducer needs to determine:

1. `new resource.Queue` is called twice, the parameters passed are `queue1` and `queue2`, respectively, corresponding to two special objects;
2. The special method `subscribe` is called once, the caller is the special object corresponding to `queues["one"]`, and the parameter passed is a function;
3. Extract this function parameter as a closure.

```typescript
const queues = {
  one: new resource.Queue("queue1"),
  two: new resource.Queue("queue2"),
};

queues["one"].subscribe(async () => {
  console.log("Hello, Pluto!");
});
```

## Required Atomic Capabilities

From the above descriptions and examples, it can be concluded that Deducer requires the following 4 capabilities:

1. **Finding the construction process of special objects**: Determine which special type constructors are called in the program code, thereby creating which special objects, corresponding to examples 1, 2, 3, 4, 5, 6.
2. **Finding the call process of special methods**: Determine which special methods of which special objects are called in the program code, corresponding to examples 2, 3, 5, 6.
3. **Value computation**:
   - One situation is used to determine the specific value of the non-function type parameters passed when analyzing the calling of the constructor and special methods, corresponding to examples 1, 3, 4, 5;
   - Another situation is used to determine which special object is the specific caller of the special method, corresponding to examples 3, 6.
4. **Closure extraction**: Used to extract the function type parameters passed when analyzing the calling of the constructor and special methods into closures, corresponding to examples 2, 5, 6.

## Implementation Strategy for Atomic Capabilities

Since Pluto wants to complete intent understanding without executing user code, it uses static program analysis to implement the above capabilities. The following implementation strategies use Call Graph, control flow graph, data flow graph, static type judgment, etc.

Build the **Call Graph** of the application program to determine all the functions that the entire application program may execute. Then traverse each expression in each function one by one to find the positions where the two types of processes occur. Since the two types of processes may occur in the dependent library, the construction of the Call Graph should include the dependent library functions called, but to reduce overhead, you can selectively focus on some dependent libraries based on conditions, such as those with the Pluto logo.

To determine whether an expression is the construction process of a special object or the call process of a special method, you need to search along the inheritance chain of the class to see if there is an interface or class that identifies a special type or special method on the chain.

For each expression that constructs a special object, count from the **control flow graph** how many control paths lead to this expression, that is, how many times this expression is called, which also represents how many special objects the program creates. Based on the **control flow graph**, determine whether the control path is in a control structure such as conditions, loops, etc., that is, the path where the number of executions is uncertain. If it is in such a control path, directly report an error and give the position of the control structure and the path that depends on it. For each control path that constructs a special object, use the **data flow graph** to deduce the specific values of the parameters passed in this control path. If there are statically undeducible parameter values, directly report an error and give the undeducible position and the path that depends on this value.

Similarly, for each expression that calls a special method, also use the **control flow graph** to count the number of executions and determine whether there are paths where the number of executions is uncertain. Then, use the **data flow graph** to perform value calculation and deduce the specific values of the parameters passed when calling the expression.

When deducing the specific value of the parameter, if you encounter a function type parameter, you need to extract it as a closure. When extracting, first use the **data flow graph** to find the position where the function variable is defined, then use the **control flow graph** to extract all processes that the function depends on. For variables captured by the closure, it must be ensured that they are constant variables, because the execution environment of the closure itself is stateless, so if it is not a constant, an error should be reported to the user. In addition, since the function parameter has not been called, the function does not appear in the **Call Graph**, so when extracting the closure, you need to check whether there are processes of constructing special objects and calling special methods, and judge whether there are processes that should not appear in the closure.

### Edge Cases

Deducer requires that the type of the special object cannot change, the special object cannot be copied to other types of variables, and other types of variables cannot be assigned or typecast to special objects. When performing value calculation for special objects, you need to check whether the type of the special object has changed, lost, or been typecast in the entire data path. If such behavior is found, an error is reported and the occurrence position is prompted.

The premise of Deducer's work is to be able to find special types and special methods. If there is no type information in the program code, it directly reports an error and exits. If there is some use of the `any` type, a warning message is given.

If type loss occurs during value calculation of parameters, if it affects value inference, report an error and prompt the occurrence position, otherwise ignore it.
