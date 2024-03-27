# @plutolang/graphviz-generator

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

- Updated dependencies [62a0009]
  - @plutolang/base@0.2.8

## 0.2.7

### Patch Changes

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

- Updated dependencies [de25ad5]
  - @plutolang/base@0.1.1

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

### Patch Changes

- Updated dependencies [055b3c7]
  - @plutolang/base@0.1.0

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
