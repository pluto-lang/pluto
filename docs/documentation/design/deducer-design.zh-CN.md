---
title: Deducer 需求与设计
date: 2024-02-05
---

# Deducer 需求与设计

本篇文档对 Deducer 的功能需求与实现思路进行详细描述，不局限于具体语言。

## 功能需求

Deducer 对一类特殊类型的实例化对象（下称特殊对象）予以特殊关注，关注特殊类型的实例化过程（即构造函数的调用），以及特殊类型的实例化对象（特殊对象）对特殊方法的调用。具体地，关注构造函数、特殊方法每一次调用时传入的参数信息，如果函数定义中对应的参数类型是函数类型，则需要将其提取成计算闭包，其他类型，则需要将其具体的值推导出来，推导或提取失败可报错。

- **根类型(Root Type)**：指 Pluto 在 Base SDK 中规定的一组特殊接口，不同接口的含义与效果不尽相同。这些根接口是 Deducer 判断某对象或方法是否需要被特殊关注的根本依据。例如，下方示例中的 `base.IResource`、`base.IResourceClientApi`、`base.IResourceInfraApi`、`base.IResourceCapturedProps` 都是根类型，其中 `base.IResource` 用于标识其子类或接口是云资源类型；`base.IResourceClientApi` 表示其子类或接口中的方法为云资源实例的功能方法，可被运行时访问；`base.IResourceInfraApi` 用于标识其子类或接口中的方法为部署时需执行的方法，用于构建云资源实例与关系；`base.IResourceCapturedProps` 用于标识其子类或接口中的方法为云资源属性，且该属性的具体值是在部署时才产生的，感兴趣可以阅读[这篇文档](./capture-value.zh-CN.md)。
- **特殊类型(Special Type)**：指实现或扩展了某个根类型的类或接口。例如，下方示例中 `resource.Queue` 扩展了 `base.IResource` 根类型，因此 `resource.Queue` 是一种特殊类型。
- **特殊方法(Special Method)**：实现或扩展了某个根类型的类或接口中包含的方法。例如，下方示例中 `resource.IQueueClientApi` 、`resource.IQueueInfraApi`、`resource.IQueueCapturedProps` 分别扩展了 `base.IResourceClientApi`、`base.IResourceInfraApi`、`base.IResourceCapturedProps` 三个根类型，这三个接口中包含的方法都属于特殊方法。需要注意的是，只有特殊方法的调用方是特殊类型时，才会被特殊关注，否则认为是普通方法。例如，示例中的 `push`、`subscribe`、`id` 方法只有被作为 `resource.Queue` 类型的方法被调用时，才被认为是特殊方法。
- **特殊对象(Special Object)**：特殊类型的实例化对象。

通过实现特殊类型与特殊方法，可以将平台能力提供到用户的业务编程界面中，即以用户友好的形式将平台能力暴露给用户。例如用户在程序代码中创建一个 `resource.Queue` 类型的对象，在部署时即可自动创建一个 AWS SNS 实例或 K8s 集群中的 Redis Deployment。特殊类型与特殊方法的实现过程通常存在于 [Pluto 模式的 SDK](../concepts/sdk.zh-CN.md) 中，具体扩展过程可参考[这篇文档](../../dev_guide/extend-sdk.zh-CN.md)。

TypeScript 示例：

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

Python 示例：

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

因此，Deducer 需要在程序代码中找到：1）特殊对象被实例化的过程（构造函数的调用过程）；2）特殊对象对特殊方法的调用过程。同时确定这些调用过程中的信息。由于，程序代码的组织形式复杂多样，这些过程可能出现在各类位置，包括嵌套函数、函数闭包、依赖库等情况，这里列举几个例子，在实现中并不一定全部支持，但需要给用户友好提示。

**（1）实例化过程在闭包内**

下面例子中，实例化过程封装在一个函数 `createAndConfigQueue` 中，构造函数的参数由上层函数入参给定。 `createAndConfigQueue` 函数作为参数入参传入 `buildQueue` 函数中，并在其中被调用。

Deducer 需要确定：

1. `new resource.Queue` 被调用两次，两次传入的参数分别是 `queue1` 和 `queue2`，分别对应于 `queue1`、`queue2` 两个特殊对象。

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

**（2）隐含特殊对象**

下面例子中，特殊类型的构造函数返回没有赋值给变量，而是直接调用了该返回值的特殊方法`subscribe`。

Deducer 需要确定：

1. `new resource.Queue` 被调用一次，且参数为空，这次实例化过程产生了一个特殊对象；
2. 随后调用了这个特殊对象的 `subscribe` 特殊方法，传入此次调用的参数是一个函数；
3. Deducer 将该函数提取为闭包函数。

```typescript
new resource.Queue().subscribe(async () => {
  console.log("Hello, Pluto!");
});
```

**（3）函数入参做特殊方法的调用方**

下面例子中，特殊方法 `push` 在函数 `pushOneMessage` 被调用，而调用方，则是根据函数入参确定。

Deducer 需要确定：

1. `new resource.Queue` 被调用两次，两次传入的参数分别是 `queue1` 和 `queue2`，分别对应于 `queue1`、`queue2` 两个特殊对象。
2. `queue.push` 特殊方法被调用一次，调用方是特殊对象 `queue1` ，传入的参数是 `"Hello, Pluto!"`。

```typescript
const queue1 = new resource.Queue("queue1");
const queue2 = new resource.Queue("queue2");

function pushOneMessage(queue: resource.Queue, msg: string) {
  queue.push(msg);
}

pushOneMessage(queue1, "Hello, Pluto!");
```

**（4）函数参数是函数返回值**

下面例子中，特殊类型 `resource.Queue` 的构造函数传入的参数是 `getName()` 的返回值。

Deducer 需要确定：

1. `new resource.Queue` 被调用一次，传入的参数是 `queueName`，对应 `queue` 是一个特殊对象。

```typescript
function getName(): string {
  return "queueName";
}

const queue = new resource.Queue(getName());
```

**（5）特殊方法重命名，间接访问**

下面例子中，特殊对象 `queue` 的特殊方法 `subscribe` 被赋值给 subFunc 函数变量，随用调用了该函数变量。

Deducer 需要确定：

1. `new resource.Queue` 被调用一次，传入的参数是 `queue`，对应 `queue` 是一个特殊对象；
2. 特殊方法 `subscribe` 被调用一次，调用方是特殊对象 `queue`，传入的参数是一个函数；
3. 将该函数参数提取成闭包。

```typescript
const queue = new resource.Queue("queue");

const subFunc = queue.subscribe.bind(queue);

subFunc(async () => {
  console.log("Hello, Pluto!");
});
```

**（6）动态资源对象访问，间接访问**

下面例子中，构建了一个 JS 对象 `queues`，该对象包含键值对，值都为特殊对象。随后，通过索引访问其中一个特殊对象。

Deducer 需要确定：

1. `new resource.Queue` 被调用两次，传入的参数分别是 `queue1`和 `queue2`，对应有两个特殊对象；
2. 特殊方法 `subscribe` 被调用一次，调用方是 `queues["one"]` 对应的特殊对象，传入的参数是一个函数；
3. 将该函数参数提取成闭包。

```typescript
const queues = {
  one: new resource.Queue("queue1"),
  two: new resource.Queue("queue2"),
};

queues["one"].subscribe(async () => {
  console.log("Hello, Pluto!");
});
```

## 所需的原子能力

从以上描述与实例可以总结，Deducer 所需的能力包括如下 4 个：

1. **特殊对象的构造过程查找**：确定程序代码调用了哪些特殊类型的构造函数，进而创建了哪些特殊对象，对应示例 1、2、3、4、5、6。
2. **特殊方法的调用过程查找**：确定程序代码中哪些特殊对象的哪些特殊方法被调用，对应示例 2、3、5、6。
3. **值演算**：
   - 一种情况用于在分析构造函数、特殊方法的调用时，确定传入的非函数类型参数的具体值是多少，对应示例 1、3、4、5；
   - 另一情况用于确定特殊方法的调用方具体是哪个特殊对象，对应示例 3、6。
4. **闭包提取**：用于在分析构造函数、特殊方法的调用时，将传入的函数类型参数提取成闭包，对应示例 2、5、6。

## 原子能力的实现思路

由于 Pluto 希望在不执行用户代码的情况下完成意图理解，因此采用静态程序分析的方式来实现以上能力，以下实现思路使用了 Call Graph 、控制流图、数据流图、静态类型判断等手段。

构建应用程序的 **Call Graph**，确定整个应用程序可能执行到的函数。然后逐个遍历每一个函数中的每一个表达式，查找两类过程发生的位置。由于两类过程可能发生在依赖库中，因此 Call Graph 的构建应该包括调用的依赖库函数，但为降低开销，可以根据条件筛选只关注部分依赖库，例如具有 Pluto 标识的依赖库。

判断一处表达式是否为特殊对象的构造过程或特殊方法的调用过程，需要通过类的继承链来查找链上是否存在标识特殊类型或特殊方法的接口或类。

针对每一处构造特殊对象的表达式，从**控制流图**中统计有多少条控制链路导向了该表达式，即表示该表达式被调用了多少次，也就表示了程序创建多少个特殊对象。根据**控制流图**判断控制链路是否处在条件、循环等控制结构中，即执行次数不确定的链路中。如果处在此类控制链路中，则直接报错，并给出控制结构位置与依赖的链路。针对每一条构造特殊对象的控制链路，利用**数据流图**推导此次控制链路中，构造表达式传入的各项参数的具体值。如果存在静态不可推导的参数值，则直接报错，并给出不可推导的位置与依赖该值的链路。

同理，针对每一处调用特殊方法的表达式，同样利用**控制流图**统计被执行的次数，并判断是否存在执行次数不确定的链路。然后，利用**数据流图**完成值演算，推导调用表达式时传入的各项参数的具体值。

在推导传入参数具体值时，如果遇到函数类型参数，需要将其提取成闭包。提取时，首先利用**数据流图**找到函数变量定义的位置，然后利用**控制流图**将函数依赖的所有过程抽取。对于闭包捕获的变量，必须保证其是常量变量，因为闭包的执行环境本身是无状态的，因此，如果不是常量，应该给用户报错。此外，由于函数参数没有被调用，所以该函数并没有体现在 **Call Graph** 中，因此在提取闭包时，需要同时查看是否存在特殊对象的构造过程和特殊方法的调用过程，判断是否存在不应该出现在闭包中的过程。

### 边界情况

Deducer 要求特殊对象的类型不能发生变化，特殊对象不能复制给其他类型的变量，同时其他类型的变量也不能赋值或强制类型转换成特殊对象。在针对特殊对象进行值演算时，需要检查在整个数据链路中，特殊对象的类型是否发生变化、丢失，或被强制类型转换，如果发现此类行为，则报错并提示发生位置。

Deducer 工作的前提是能够查找出特殊类型与特殊方法，如果程序代码中没有任何类型信息，则直接报错退出。如果存在部分 `any` 类型的使用，则给出警告信息。

如果在对参数值进行值演算时发生类型丢失，如果影响值的推断，则报错并提示发生位置，否则忽略。