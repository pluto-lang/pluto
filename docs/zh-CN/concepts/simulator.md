> 仿照 Winglang 实现设计。

![Simulator Design](../../../assets/simulator-design.png)

基本思路为，Simulator 创建资源组件模拟实例，并以 HTTP Server 对外暴露服务。FaaS 组件不在 Simulator 环境内执行，而是在一个独立的 VM 环境中执行，调用各 BaaS 组件时，会通过 RPC 与 Simulator 交互完成功能调用。

## 构建依据

Simulator 根据 Arch Ref 的 resource 列表依次构建每一个 BaaS 组件资源，然后将 relationship 列表的每一项作为一个 Event Handler 配置，from 资源为事件发起方，to 资源为事件处理方，op 名称为事件类型，参数为事件配置。from 资源根据这些配置项添加自己的 Event Handler 列表，并根据自身执行情况决定是否以及如何触发事件。

## 资源实现大纲

对外暴露提供能力的是资源的 Infra 类型，但实现的是 Client API。在 Simulator 中，Infra API 不起作用。 Client SDK 中的各资源的 Client 都为 Simulator 的 Client，用于 RPC 调用 Infra 实例的 API。

## 测试 工作流程

1. 执行 pluto test --sim
2. test command 调用 deducer 推导构建 arch ref
3. test command 调用 generator 生成计算模块
4. test command 调用 simulator adaptor 根据 arch ref 构建 simulator，获取 simulator 的 url
   1. 构建 arch 拓扑
   2. 遍历 resources，加载依赖库，根据 resource 的 type 及 参数 创建 client 实例对象
   3. 遍历 relationships，给 from 资源添加 Event Handler
5. test command 根据 test 函数的 id 通知 simulator 调用执行相应函数，并获取执行结果
   1. 根据 函数 ID 找到 函数 的实例对象
   2. 执行函数对象的 invoke 方法
      1. invoke 创建 VM 沙盒，执行函数
      2. 函数依赖的资源对象都为 Proxy 对象
6. test command 展示测试结果
