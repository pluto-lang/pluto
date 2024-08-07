# @plutolang/static-generator

## 0.4.10

### Patch Changes

- c45700e: feat(generator): support resource type definition in subdirectories

  Previously, resource types could only be defined in the root directory. This commit enables defining the resource type within subdirectories.

  SDK developers can now specify the fully qualified name (FQN) of a resource type in the format `<package_name>.<directory_name>.<class_name>`. In the infrastructure SDK, define the resource type as `<directory_name>.<class_name>`.

- Updated dependencies [dbbfde4]
  - @plutolang/base@0.4.10

## 0.4.9

### Patch Changes

- Updated dependencies [8f0e48d]
  - @plutolang/base@0.4.9

## 0.4.8

### Patch Changes

- Updated dependencies [c8dfa7a]
  - @plutolang/base@0.4.8

## 0.4.7

### Patch Changes

- Updated dependencies [b277a26]
  - @plutolang/base@0.4.7

## 0.4.6

### Patch Changes

- Updated dependencies [4e5b0b1]
  - @plutolang/base@0.4.6

## 0.4.5

### Patch Changes

- 6f75db8: refactor(base): refactor architecture reference data structure

  Refine the argument type for adding resources to capture property types, clarifying usage. Redefine the three Relationship types for improved code readability and to clarify resource relationships across various scenarios.

- 339dcfb: feat(base): add type attribute to topology sort results

  The topology sort previously returned a list of Entity instances, including Resource, Closure, and Relationship types. Processing these required type-checking each entity via attribute comparison, which was cumbersome and error-prone.

  This commit introduces a 'type' attribute to the topology sort's output, distinguishing between 'resource', 'bundle', and 'relationship'. This enhancement simplifies entity processing and increases code safety.

- Updated dependencies [6f75db8]
- Updated dependencies [339dcfb]
  - @plutolang/base@0.4.5

## 0.4.4

### Patch Changes

- 87f35b5: feat: enable runtime access to locally defined env vars

  Previously, environment variables were only accessible through the resource constructor and infrastructure APIs. This commit enables client APIs to access these variables.

  During function argument extraction by the deducer from the resource constructor or infrastructure APIs, all accessed environment variables within the compute closure are recorded. These variables are then passed to the architecture reference. Subsequently, the generator declares these environment variables for each closure variable in the IaC code. When the adapter runs the IaC code, it sets up the environment variables for the built function instance, such as AWS Lambda instances. The procedure of setting up these environment variables is written in the infrastructure SDK.

- Updated dependencies [87f35b5]
  - @plutolang/base@0.4.4

## 0.4.3

### Patch Changes

- Updated dependencies [0a01098]
  - @plutolang/base@0.4.3

## 0.4.2

### Patch Changes

- 8819258: fix(generator): failed to generate iac code due to missing type information in webpack
- Updated dependencies [8819258]
  - @plutolang/base@0.4.2

## 0.4.1

### Patch Changes

- Updated dependencies [2a0a874]
  - @plutolang/base@0.4.1

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
  - @plutolang/base@0.4.0

## 0.3.1

### Patch Changes

- Updated dependencies [d285a49]
  - @plutolang/base@0.3.1

## 0.3.0

### Minor Changes

- cc4fd80: feat: closure mode support, architecture reference structure enhancements, user custom function resource support

  - Closure Mode Support: Comprehensive modifications have been made to add support for closure mode. These include updates to the SDK for various cloud platforms, enhancing the deducer's closure analysis capabilities, incorporating closure import statements in the generated IaC code, and more.
  - Architectural Reference Structure Enhancements: The architectural reference structure now includes closure items. The CLI, generator, and deducer have been adjusted to align with the updated architectural reference structure.
  - User Custom Function Resource: Support has been added for user custom function resources on Alicloud, AWS, and Kubernetes.
  - Documentation Updates: The documentation has been revised to reflect these changes.

### Patch Changes

- Updated dependencies [cc4fd80]
  - @plutolang/base@0.3.0

## 0.2.9

### Patch Changes

- Updated dependencies [fe44c8e]
  - @plutolang/base@0.2.9

## 0.2.8

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource
- Updated dependencies [62a0009]
  - @plutolang/base@0.2.8

## 0.2.7

### Patch Changes

- 5ae1dec: feat: support for transfering the values generated by compile-time to runtime

  Note: it hasn't supported for simulation testing yet, but it already can be used on the cloud platform.

- Updated dependencies [5ae1dec]
  - @plutolang/base@0.2.7

## 0.2.6

### Patch Changes

- Updated dependencies [bf60683]
  - @plutolang/base@0.2.6

## 0.2.5

### Patch Changes

- Updated dependencies [0d8fc6f]
  - @plutolang/base@0.2.5

## 0.2.4

### Patch Changes

- 5736dc1: enhance: refactor the component apis
- 38eef8e: enhance: normalize the configuration models, including project and stack.
- Updated dependencies [5736dc1]
- Updated dependencies [38eef8e]
  - @plutolang/base@0.2.4

## 0.2.3

### Patch Changes

- Updated dependencies [3401159]
  - @plutolang/base@0.2.3

## 0.2.2

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS
- Updated dependencies [c2bcfb6]
  - @plutolang/base@0.2.2

## 0.2.1

### Patch Changes

- Updated dependencies [a5539e6]
  - @plutolang/base@0.2.1

## 0.2.0

### Minor Changes

- 505de47: https://github.com/pluto-lang/pluto/releases/tag/v0.2.0

### Patch Changes

- Updated dependencies [505de47]
  - @plutolang/base@0.2.0

## 0.1.1

### Patch Changes

- de25ad5: feat(deducer,generator): support accessing the constants that located outside of the function scope"
- Updated dependencies [de25ad5]
  - @plutolang/base@0.1.1

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

### Patch Changes

- Updated dependencies [055b3c7]
  - @plutolang/base@0.1.0

## 0.0.3

### Patch Changes

- c504f5b: Support schedule resource on AWS and K8s.

## 0.0.2

### Patch Changes

- rename @pluto to @plutolang
- Updated dependencies
  - @plutolang/base@0.0.2

## 0.0.1

### Patch Changes

- first release
- Updated dependencies
  - @pluto/base@0.0.1
