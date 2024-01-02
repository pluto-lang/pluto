---
title: Rethinking a Cloud-Native Application Development Paradigm
---

# Rethinking a Cloud-Native Application Development Paradigm

![cover](../../assets/231227-cover.png)

## Introduction

Cloud-native applications are conventionally identified as those designed and nurtured on cloud infrastructure. Such applications, rooted in cloud technologies, skillfully benefit from the cloud's features of autoscaling and high reliability. This offers robust support for individual developers and SMEs, liberating them from wrestling with the complexities of infrastructure management—an undoubtedly attractive proposition.

### Present Scenario

So, how are cloud applications currently being developed? References to cloud-native applications usually conjure images of containers and microservices, both of which are intrinsic to the CNCF's definition of the term. A typical development workflow might encompass writing application code at a microservices level, packaging it into containers, and deploying it onto a PaaS platform.

However, as cloud technologies evolve, Function as a Service (FaaS) has emerged as a pivotal cloud component. Compared to PaaS, FaaS integrates more intimately with cloud capabilities, offering superior performance in scaling and cold starts. For instance, AWS Lambda has achieved cold start latencies on the order of hundreds of milliseconds

### Hurdles

But does the traditional development methodology of microservices and containers still prove effective for FaaS-based cloud-native applications? Consider the following:

1. Services encapsulated by functions, often called NanoServices, possess a finer granularity than microservices. The process of packaging and deploying each function individually can be **tedious**, despite the command-line tools provided by cloud vendors.
2. Dividing an application into numerous functions, each functionally isolated, necessitates inter-function communication via SDKs. This results in a development experience that lacks **consistency**, with frequent context-switching among functions.
3. Orchestrating functions entails a **steep learning curve**, demanding familiarity with the cloud's event mechanisms and orchestration tools.

Essentially, the development model directly based on FaaS falls short of ideal, posing substantial challenges in effectively managing and coordinating functions. It's only natural to aspire for an improved application development experience. To this end, a fresh concept is proposed: **Monolithic Programming, Compile-Time Splitting, and Distributed Execution**.

![principle](../../assets/231227-step.png)

## Conceptual Analogies

This concept might strike a chord with the parallel programming framework OpenMP. OpenMP leverages the compiler to inject multithreading code for parallel execution within code segments earmarked for concurrency. Similarly, this novel concept uses the compiler to identify and extract code regions capable of independent computation, while the cloud infrastructure assumes the responsibility of managing the distributed execution.

Frameworks like MapReduce, Spark, and the increasingly popular Ray, all operating in the realm of cloud computing, target large-scale distributed computing. The notable difference here lies in the underlying runtime implementation. While these frameworks construct their runtime environments to support the distributed execution of specific task types, the proposed concept harnesses FaaS provided by cloud infrastructure as a uniform underlying environment to enable general computation for a range of cloud-native applications. This approach presents the potential for tighter integration with cloud capabilities and accommodates diverse workloads.

## The Concept

### Why "Monolithic Programming"?

Developing a monolithic application is a remarkably seamless experience. With all context residing within a single project, tools like linters, formatters, and IDE plugins can verify variable dependencies and function calls prior to execution.

### How is "Compile-time Splitting" Achievable?

Files containing code devoid of programming constraints are challenging to split. Nevertheless, by defining keywords, special classes, or functions, the compiler can be directed to partition the code.

Consider the code snippet below. The `Function` class can be viewed as a special construct, where the function definition passed to its constructor is analyzed and extracted into a standalone computational module. Of course, real-world implementations would necessitate addressing many more nuances.

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

Crucially, once computational modules are demarcated, the original code file excluding these modules should also be treated as a computational module. This module serves as the application's entrypoint, akin to the main function in a monolithic app, orchestrating the entire application logic.

Thus, we achieve the development experience of monolithic programming, paired with the capability for cloud-based distributed execution through compile-time splitting. The outcome of this development approach is an application that thrives directly on the cloud infrastructure, embodying a true cloud-native app.

## Example

Take an example program based on this concept. The program applies the Monte Carlo method to compute Pi. The logic is straightforward: spawn 10 Workers, each conducting a million samples, then accumulate the results.

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

![show case](../../assets/231227-case.png)

The execution of this code is expected to pan out as depicted above:

1. During the compilation stage, two computational modules are extracted: one for `calculatePi`, and another for the main code, excluding `calculatePi`.
2. These modules are subsequently deployed as separate FaaS resource instances.
3. Upon deployment, invoking the instance corresponding to the main code yields the output results from the logs.

For more elaborate examples, consider the following:

- [Big Data Scenario: Word Count](https://github.com/pluto-lang/pluto/issues/108)
- [Web Scenario](https://github.com/pluto-lang/pluto/issues/109)

[Pluto](https://github.com/pluto-lang/pluto) is committed to further exploring this concept throughout 2024, with a focus on leveraging static analysis and Infrastructure as Code (IaC) to facilitate implementation. If you find this concept intriguing or have relevant use cases, we encourage you to connect with us.

If you support this idea, please star the [project](https://github.com/pluto-lang/pluto).

## References

- [CNCF Cloud Native Definition v1.0](https://github.com/cncf/toc/blob/main/DEFINITION.md)
- [Lambda execution environments - AWS Lambda](https://docs.aws.amazon.com/lambda/latest/operatorguide/execution-environments.html)
- [Pluto | GitHub](https://github.com/pluto-lang/pluto)
- [Pluto Website](https://pluto-lang.vercel.app)
