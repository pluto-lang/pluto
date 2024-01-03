Understanding the intent of user code, including creating resources, accessing resources, establishing relationships between resources, etc., to deduce the entire logical architecture (Architecture Reference) of the application.

## Inputs

- User Code
- node_modules
- Output Directory

## Outputs

- Computed Closure Collection
- Application Architecture
  1. All dependent BaaS resources
  2. All included computation closures
  3. Dependencies between computation closures and resources
     1. The Main closure creates all BaaS resources
     2. The BaaS resource's infra API creates various Function closures
     3. Each closure may call some or all of the BaaS resource's client API

## Required Capabilities

1. Determine which BaaS resources the application depends on
   1. Analyze what resource objects the code has created
   2. Judging condition: The resource object's class implements the `Resource` interface
2. Determine which computation closures are included in the application
   1. Analyze which infra APIs each resource object calls, all function arguments of the infra API will be runtime functions, encapsulated into computation closures
   2. Judging condition: The called infra API belongs to an interface that extends the `ResourceInfraAPI` interface
3. Determine which client API of which resource objects are called in each computation closure
   1. Judging condition: The called client API belongs to an interface that extends the `ResourceClientAPI` interface
4. Determine which property of which resource objects are accessed in each computation closure
   1. Judging condition: The called property belongs to an interface that extends the `ResourceProps` interface

## Example

This example merely illustrates Deducer's responsibilities which differ from actual implementation.

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

In this case, there are two resource objects, namely `queue` and `kvstore`. The information that needs to be inferred from this case includes:

- Identifying which resource objects have been created, i.e., which objects have `Resource` in their inheritance chain.
- Determining which resource objects' Infra API have been invoked, i.e., which function calls were invoking methods of the resource objects, and these methods have `ResourceInfraApi` in their inheritance chain.
- Identifying which resource objects' Client API have been invoked in a specific scope (Infra API parameters and global scope), i.e., which methods belonging to `ResourceClientApi` have been invoked. For instance,
  - Within the `handler` parameter scope of 'queue.subscribe', `set`, a Client API of `kvstore`, is invoked. The information needed here is which function scope (`handler`) is invoking which object (`kvstore`) and which method (`set`).
  - In the global scope, the `pushMsg` method is invoked, which calls a Client API. However, the resource object to which this Client API belongs is given by the parameters, so it might be necessary to find out which queue it is from the call chain.
  - More complexly, there may be nested function calls.
- Determining which resource objects' Props have been invoked, which is similar to the Client API case, i.e., which function scope is invoking which object's property.

After inferring these information, the further task is to obtain the argument lists when constructing resource objects and invoking Infra API. The values of these argument lists are statically deducible (by constraining the user's programming behavior). For example, the argument of the `queue` constructor is the `queueName` variable, and it is hoped to infer the value passed to the constructor during construction ("queue").

In other words, the final output includes: a list of resource objects, a list of Infra API calls to each resource object, which Client API and Props of each resource object are called in each scope (only concerned with Infra API parameters and global scope), and the calling relationships between each resource object.
