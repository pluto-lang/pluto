# @plutolang/cli

## 0.4.3

### Patch Changes

- 5f3abe1: fix(deducer): failed to bundle the dependencies of pyright-internal when publishing pyright-deducer

  Before, we used the `bundleDependencies` option to bundle the dependencies of `pyright-internal` when publishing `pyright-deducer`. However, it failed to include the dependencies of `pyright-internal` when publishing `pyright-deducer`. So, we opted to utilize webpack to bundle the entire `pyright-deducer` package along with all its dependencies, including `pyright-internal` and its dependencies.

  Because webpack bundles each dependency of `pyright-deducer` into a single file, if we attempt to verify whether an instance of PyrightDeducer from `pyright-deducer` is an instance of Deducer from `@plutolang/base`, we will receive a false result. Therefore, we should check for the existence of the `deduce` method instead.

- Updated dependencies [5f3abe1]
  - @plutolang/pyright-deducer@0.1.2

## 0.4.2

### Patch Changes

- Updated dependencies [1ca8e3c]
- Updated dependencies [2a0a874]
  - @plutolang/pyright-deducer@0.1.1
  - @plutolang/base@0.4.1
  - @plutolang/pulumi-adapter@0.4.1
  - @plutolang/simulator-adapter@0.3.6
  - @plutolang/static-deducer@0.4.2
  - @plutolang/graphviz-generator@0.4.1
  - @plutolang/static-generator@0.4.1

## 0.4.1

### Patch Changes

- Updated dependencies [daa6ef9]
  - @plutolang/static-deducer@0.4.1
  - @plutolang/simulator-adapter@0.3.5

## 0.4.0

### Minor Changes

- 1c3c5fa: feat: python support, validated with quickstart

  We created a deducer using Pyright. It can automatically analyze the dependent packages for each section of business logic, and the adapter includes them in the zip archive for publishing on AWS Lambda.

  Currently, Pluto supports simple Python projects. Users can use the pluto command to create and deploy Python projects. However, if the project relies on packages with different distribution packages on various platforms, or if the archive size after zipping exceeds the AWS limit of 50 MB, it will fail.

  For more details, you can find in the PRs related to the issue https://github.com/pluto-lang/pluto/issues/146 .

### Patch Changes

- 11ecc36: feat: support python workflow
- Updated dependencies [1c3c5fa]
- Updated dependencies [11ecc36]
  - @plutolang/pyright-deducer@0.1.0
  - @plutolang/graphviz-generator@0.4.0
  - @plutolang/static-generator@0.4.0
  - @plutolang/pulumi-adapter@0.4.0
  - @plutolang/static-deducer@0.4.0
  - @plutolang/base@0.4.0
  - @plutolang/simulator-adapter@0.3.4

## 0.3.3

### Patch Changes

- d285a49: Feature: refactor Pluto's output management

  Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

- Updated dependencies [d285a49]
  - @plutolang/simulator-adapter@0.3.3
  - @plutolang/pulumi-adapter@0.3.1
  - @plutolang/base@0.3.1
  - @plutolang/static-deducer@0.3.1
  - @plutolang/graphviz-generator@0.3.1
  - @plutolang/static-generator@0.3.1

## 0.3.2

### Patch Changes

- @plutolang/simulator-adapter@0.3.2
- @plutolang/static-deducer@0.3.0

## 0.3.1

### Patch Changes

- @plutolang/simulator-adapter@0.3.1
- @plutolang/static-deducer@0.3.0

## 0.3.0

### Minor Changes

- cc4fd80: feat: closure mode support, architecture reference structure enhancements, user custom function resource support

  - Closure Mode Support: Comprehensive modifications have been made to add support for closure mode. These include updates to the SDK for various cloud platforms, enhancing the deducer's closure analysis capabilities, incorporating closure import statements in the generated IaC code, and more.
  - Architectural Reference Structure Enhancements: The architectural reference structure now includes closure items. The CLI, generator, and deducer have been adjusted to align with the updated architectural reference structure.
  - User Custom Function Resource: Support has been added for user custom function resources on Alicloud, AWS, and Kubernetes.
  - Documentation Updates: The documentation has been revised to reflect these changes.

### Patch Changes

- Updated dependencies [cc4fd80]
  - @plutolang/graphviz-generator@0.3.0
  - @plutolang/simulator-adapter@0.3.0
  - @plutolang/static-generator@0.3.0
  - @plutolang/pulumi-adapter@0.3.0
  - @plutolang/static-deducer@0.3.0
  - @plutolang/base@0.3.0

## 0.2.11

### Patch Changes

- fe44c8e: chore(sdk): reformat the code to follow the norm
- Updated dependencies [fe44c8e]
  - @plutolang/simulator-adapter@0.2.10
  - @plutolang/pulumi-adapter@0.2.10
  - @plutolang/base@0.2.9
  - @plutolang/static-deducer@0.2.9
  - @plutolang/graphviz-generator@0.2.9
  - @plutolang/static-generator@0.2.9

## 0.2.10

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource
- Updated dependencies [62a0009]
  - @plutolang/simulator-adapter@0.2.9
  - @plutolang/static-generator@0.2.8
  - @plutolang/pulumi-adapter@0.2.9
  - @plutolang/base@0.2.8
  - @plutolang/static-deducer@0.2.8
  - @plutolang/graphviz-generator@0.2.8

## 0.2.9

### Patch Changes

- 5ae1dec: feat: support for transfering the values generated by compile-time to runtime

  Note: it hasn't supported for simulation testing yet, but it already can be used on the cloud platform.

- Updated dependencies [5ae1dec]
  - @plutolang/static-generator@0.2.7
  - @plutolang/static-deducer@0.2.7
  - @plutolang/base@0.2.7
  - @plutolang/simulator-adapter@0.2.8
  - @plutolang/pulumi-adapter@0.2.8
  - @plutolang/graphviz-generator@0.2.7

## 0.2.8

### Patch Changes

- 1352464: feat(cli): add version checker

## 0.2.7

### Patch Changes

- bf60683: enhance(adapter): split the adapter package
- Updated dependencies [bf60683]
  - @plutolang/simulator-adapter@0.2.7
  - @plutolang/pulumi-adapter@0.2.7
  - @plutolang/static-deducer@0.2.6
  - @plutolang/base@0.2.6
  - @plutolang/graphviz-generator@0.2.6
  - @plutolang/static-generator@0.2.6

## 0.2.6

### Patch Changes

- 0d8fc6f: fix: the directory does not exist when generating initial files
  fix: cannot destroy before successfully deploying
  fix: the configuration file format does not adapt the latest version
- Updated dependencies [0d8fc6f]
  - @plutolang/base@0.2.5
  - @plutolang/adapters@0.2.6
  - @plutolang/static-deducer@0.2.5
  - @plutolang/graphviz-generator@0.2.5
  - @plutolang/static-generator@0.2.5

## 0.2.5

### Patch Changes

- 5736dc1: enhance: refactor the component apis
- 38eef8e: enhance: normalize the configuration models, including project and stack.
- Updated dependencies [5736dc1]
- Updated dependencies [38eef8e]
  - @plutolang/graphviz-generator@0.2.4
  - @plutolang/static-generator@0.2.4
  - @plutolang/static-deducer@0.2.4
  - @plutolang/adapters@0.2.5
  - @plutolang/base@0.2.4

## 0.2.4

### Patch Changes

- 3401159: feat: support simulation test
- Updated dependencies [3401159]
  - @plutolang/adapters@0.2.4
  - @plutolang/base@0.2.3
  - @plutolang/static-deducer@0.2.3
  - @plutolang/graphviz-generator@0.2.3
  - @plutolang/static-generator@0.2.3

## 0.2.3

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS
- Updated dependencies [c2bcfb6]
  - @plutolang/static-generator@0.2.2
  - @plutolang/adapters@0.2.3
  - @plutolang/base@0.2.2
  - @plutolang/static-deducer@0.2.2
  - @plutolang/graphviz-generator@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [cf2a147]
  - @plutolang/adapters@0.2.2

## 0.2.1

### Patch Changes

- a5539e6: feat: support for AliCloud's ApiGateway and FC
- Updated dependencies [a5539e6]
  - @plutolang/adapters@0.2.1
  - @plutolang/base@0.2.1
  - @plutolang/static-deducer@0.2.1
  - @plutolang/graphviz-generator@0.2.1
  - @plutolang/static-generator@0.2.1

## 0.2.0

### Minor Changes

- 505de47: https://github.com/pluto-lang/pluto/releases/tag/v0.2.0

### Patch Changes

- Updated dependencies [505de47]
  - @plutolang/adapters@0.2.0
  - @plutolang/static-deducer@0.2.0
  - @plutolang/graphviz-generator@0.2.0
  - @plutolang/static-generator@0.2.0
  - @plutolang/base@0.2.0

## 0.1.3

### Patch Changes

- Updated dependencies [6f2d1d5]
  - @plutolang/static-deducer@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [de25ad5]
  - @plutolang/static-generator@0.1.1
  - @plutolang/static-deducer@0.1.2
  - @plutolang/base@0.1.1
  - @plutolang/adapters@0.1.1
  - @plutolang/graphviz-generator@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [e587e81]
  - @plutolang/static-deducer@0.1.1

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

### Patch Changes

- Updated dependencies [055b3c7]
- Updated dependencies [1356132]
  - @plutolang/adapters@0.1.0
  - @plutolang/static-deducer@0.1.0
  - @plutolang/graphviz-generator@0.1.0
  - @plutolang/static-generator@0.1.0
  - @plutolang/base@0.1.0

## 0.0.9

### Patch Changes

- 4c28ce8: Add 'yes' option to the deploy command.

## 0.0.8

### Patch Changes

- Updated dependencies [4247f22]
  - @plutolang/adapters@0.0.3

## 0.0.7

### Patch Changes

- 807854a: Add some tips on current functionality.

## 0.0.6

### Patch Changes

- Updated dependencies [fac0e1e]
  - @plutolang/static-deducer@0.0.5

## 0.0.5

### Patch Changes

- Updated dependencies [77ec0ba]
  - @plutolang/static-deducer@0.0.4

## 0.0.4

### Patch Changes

- c504f5b: Support schedule resource on AWS and K8s.
- Updated dependencies [c504f5b]
  - @plutolang/static-generator@0.0.3
  - @plutolang/static-deducer@0.0.3

## 0.0.3

### Patch Changes

- rename @pluto to @plutolang
- Updated dependencies
  - @plutolang/graphviz-generator@0.0.2
  - @plutolang/static-generator@0.0.2
  - @plutolang/static-deducer@0.0.2
  - @plutolang/adapters@0.0.2
  - @plutolang/base@0.0.2

## 0.0.2

### Patch Changes

- first release
- Updated dependencies
  - @pluto/graphviz-generator@0.0.1
  - @pluto/static-generator@0.0.1
  - @pluto/static-deducer@0.0.1
  - @pluto/adapters@0.0.1
  - @pluto/base@0.0.1
