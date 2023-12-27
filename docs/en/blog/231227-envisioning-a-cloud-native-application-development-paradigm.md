# Envisioning a Cloud-Native Application Development Paradigm

![cover](../../../assets/231227-cover.png)

## Background

Cloud-native applications are commonly depicted as those conceived and cultivated atop cloud infrastructure. Such applications, built on cloud foundations, adeptly harness the cloud's offerings of autoscaling and high reliability. For individual developers and small to medium-sized enterprises, this means powerful support without the need to grapple with the intricacies of infrastructure—a truly enticing prospect.

### Current State

How, then, are cloud applications currently developed? Mention of cloud-native applications typically brings to mind containers and microservices, both integral to CNCF's definition of the term. A standard development workflow might involve crafting application code at a microservices level, packaging it into containers, and deploying it onto a PaaS platform.

Yet, as the cloud evolves, Function as a Service (FaaS) has emerged as a critical cloud component. Compared to PaaS, FaaS integrates more closely with cloud capabilities, boasting superior performance in scaling and cold starts. For example, AWS Lambda has achieved cold start latencies on the order of milliseconds.

### Challenges

But does the development approach of microservices and containers still hold up for FaaS-based cloud-native applications? Consider the following points:

1. Services carried by functions, often termed NanoServices, have a finer granularity than microservices. The process of packaging and publishing each function individually can be **laborious**, despite the command-line tools provided by cloud vendors.
2. Splitting an application into a multitude of functions, each functionally isolated, necessitates inter-function communication via SDKs. This leads to a development experience that lacks **coherence**, with frequent context-switching among functions.
3. Orchestrating functions involves a **high learning curve**, requiring familiarity with the cloud's event mechanisms and orchestration tools.

In essence, the development model directly based on FaaS is less than ideal, posing significant challenges in managing and coordinating functions effectively. Naturally, we seek a better experience in application development. It is with this in mind that a new concept is introduced: **Monolithic Programming, Compile-Time Splitting, and Distributed Execution**.

![principle](../../../assets/231227-step.png)

## Conceptual Analogies

This concept might remind you of the parallel programming framework OpenMP. OpenMP uses the compiler to inject multithreading code for parallel execution within code segments marked for concurrency. Similarly, this new concept employs the compiler to identify and extract code regions capable of independent computation, while the cloud infrastructure takes on the role of managing the distributed execution.

Frameworks like MapReduce, Spark, and the increasingly popular Ray, all operating in the cloud computing domain, aim at large-scale distributed computing. The striking difference here lies in the underlying runtime implementation. While these frameworks build their runtime environments to support the distributed execution of specific task types, the proposed concept leverages FaaS provided by cloud infrastructure as a uniform underlying environment to enable general computation for a variety of cloud-native applications. This approach offers the potential for tighter integration with cloud capabilities and accommodates diverse workloads.

The development experiences are indeed similar.

## The Concept

### Why "Monolithic Programming"?

Developing a monolithic application is an exceptionally smooth experience. All context resides within a single project, allowing tooling such as linters, formatters, and IDE plugins to verify variable dependencies and function calls before execution.

### How is "Compile-time Splitting" Possible?

Files with code that has no programming constraints are challenging to split. However, by defining keywords, special classes, or functions, the compiler can be guided to partition the code accordingly.

Consider the code snippet below. The `Function` class can be seen as a special construct, where the function definition passed to its constructor is analyzed and extracted into a standalone computational module. Naturally, real-world implementations would require addressing many more details.

```typescript
class Function  {
    constructor(fn: (...args: any[]) => any) { /* implementation details */ }
}

const fn = new Function((a: number, b: number ) => { return a + b; });

async main() {
    const c = await fn.invoke(1, 1);
    console.log("The sum of 1 + 1 is ", c);
}
main();
```

Importantly, after computational modules are delineated, the code file sans these modules should also be treated as a computational module. This module serves as the application's entrypoint, akin to the main function in a monolithic app, orchestrating the entire application logic.

Thus, we attain the development experience of monolithic programming, coupled with the ability for cloud-based distributed execution through compile-time splitting. The offspring of this development approach is an application that thrives directly on the cloud infrastructure, epitomizing a cloud-native app.

## Example

Consider an example program based on this concept. The program employs the Monte Carlo method to compute Pi. The logic is simple: spawn 10 Workers, each conducting a million samples, then tally the results.

```typescript
const calculatePi = new Function((iterations: number): number => {
  let insideCircle = 0;

  for (let i = 0; i < iterations; i++) {
    const x = Math.random();
    const y = Math.random();
    if (x * x + y * y <= 1) {
      insideCircle++;
    }
  }

  const piEstimate = (insideCircle / iterations) * 4;
  return piEstimate;
});

async function main() {
  const workerCount = 10;
  const iterationsPerWorker = 1000000;

  let piPromises: Promise<number>[] = [];
  for (let i = 0; i < workerCount; i++) {
    piPromises.push(calculatePi.invoke(iterationsPerWorker));
  }

  const piResults = await Promise.all(piPromises);

  const piSum = piResults.reduce((sum, current) => sum + current, 0);
  const pi = piSum / workerCount;
  console.log(`Estimated value of π: ${pi}`);
}

main();
```

![show case](../../../assets/231227-case.png)

The execution of this code is expected to manifest as illustrated above:

1. During the compilation stage, two computational modules are extracted: one for `calculatePi`, and another for the main code, sans `calculatePi`.
2. These modules are then deployed as separate FaaS resource instances.
3. Upon deployment, invoking the instance corresponding to the main code yields the output results from the logs.

For more intricate examples, explore the following:

- [Big Data Scenario: Word Count](https://github.com/pluto-lang/pluto/issues/108)
- [Web Scenario](https://github.com/pluto-lang/pluto/issues/109)

Pluto is set to continue exploring this concept in 2024, with a focus on employing static analysis and Infrastructure as Code (IaC) to facilitate implementation. Those intrigued or with relevant use cases are encouraged to connect.

## References

- [CNCF Cloud Native Definition v1.0](https://github.com/cncf/toc/blob/main/DEFINITION.md)
- [Lambda execution environments - AWS Lambda](https://docs.aws.amazon.com/lambda/latest/operatorguide/execution-environments.html)
