理解用户代码的意图，包括创建资源、访问资源、建立资源间关系等，推导出应用整个逻辑架构（Architecture Reference）。

## 输入

- 用户代码
- node_modules
- 输出目录

## 输出

- 计算闭包集合
- 应用架构
  1.  依赖的所有 BaaS 资源
  2.  包含的所有计算闭包
  3.  计算闭包与资源之间的依赖关系
      1. Main 闭包创建所有 BaaS 资源
      2. BaaS 资源的 infra API 创建各个 Function 闭包
      3. 各个闭包可能调用部分或全部 BaaS 资源的 client API、props

## 所需能力

1. 确定应用依赖哪些 BaaS 资源
   1. 分析代码创建了哪些资源对象
   2. 判断条件：资源对象所属类实现了 `Resource` 接口
2. 确定应用中包含哪些计算闭包
   1. 分析各个资源对象调用了哪些 infra API，infra API 的所有函数参数都将作为运行时函数，被封装成计算闭包
   2. 判断条件：所调用的 infra API 属于某接口，该接口扩展了 `ResourceInfraAPI` 接口
3. 确定各计算闭包中调用了哪些资源对象的哪些 client API
   1. 判断条件：所调用的 client API 属于某接口，该接口扩展了 `ResourceClientAPI` 接口
4. 确定各计算闭包中调用了哪些资源对象的哪些属性
   1. 判断条件：所调用的 client API 属于某接口，该接口扩展了 `ResourceProps` 接口

## 示例

该示例仅为示意 Deducer 工作内容，与具体实现存在不同。

```typescript
interface Resource {}
interface ResourceProps {}
interface ResourceInfraApi {}
interface ResourceClientApi {}

interface QueueProps extends ResourceProps {
  get topicName(): string;
}

interface QueueInfraApi extends ResourceInfraApi {
  subscribe(handler: () => void): void;
}

interface QueueClientApi extends ResourceClientApi {
  push(message: string): Promise<void>;
}

interface Queue extends Resource {}

const queueName = "queue";
// Resource object construction.
const queue = new Queue(queueName);

// Resource object construction.
const kvstore = new KVStore("kvstore");

// Infra API calling.
queue.subscribe(async () => {
  await kvstore.set("Key", "Value"); // Client API calling.
  console.log("receive a message from", queue.topicName); // Property accessing.
});

async function pushMsg(queue: Queue, message: string) {
  await queue.push(message); // Client API calling.
}

pushMsg(queue, "Hello!");
```

在这个示例中有两个资源对象，分别是 `queue` 和 `kvstore`。那在这个示例中，需要判断的内容有：

- 创建了哪些资源对象，即有哪些对象，它的所属类型继承链上有 `Resource`
- 调用过哪些资源对象的 Infra API，即哪些函数调用是调用的资源对象的方法，同时该方法的继承链有 `ResourceInfraApi`
- 特定作用域（infra API 参数和全局域）中调用过哪些资源对象的 client API，即调用了哪些属于 `ResourceClientApi` 的方法，例如
  - `queue.subscribe` 的 `handler` 参数作用域中，调用了 `kvstore` 的 `set` 这个 client API，这里需要获取的信息是 `handler` 这个方法（哪个函数域）中调用了 `kvstore` 这个对象（哪个对象） 的 `set` 方法（哪个方法）
  - 全局作用域中调用了 `pushMsg` 方法，而这个方法中调用了一个 client API，但是这个 client API 所属的资源对象是参数给定的，因此可能需要从调用链上找到是哪个 queue。
  - 这里更复杂的是，可能会有嵌套的函数调用
- 调用过哪些资源对象的 props，这种情况和 client API 相近，即哪个函数域调用了哪个对象的哪个 property

在判断出来这些内容后，还有进一步工作，就是获取 构造资源对象时 和 调用 infra API 时 的参数列表，这些参数列表的值确定是静态可推导的（通过约束用户的编程行为）。例如，`queue` 的构造函数的参数是 `queueName` 变量，希望能够推导出来在构造时传给构造函数的值是多少（"queue"）。

也就是，最终获取的输出包括：资源对象列表、各个资源对象的 infra API 调用列表、各个作用域（只关注 infra API 参数和全局域两类）调用了各个资源对象的哪些 client API 和 props、各个资源对象之间的调用关系。
