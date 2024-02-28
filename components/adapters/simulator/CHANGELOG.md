# @plutolang/simulator-adapter

## 0.3.1

### Patch Changes

- Updated dependencies [e2aa07b]
  - @plutolang/pluto-infra@0.3.1
  - @plutolang/pluto@0.3.1

## 0.3.0

### Minor Changes

- cc4fd80: feat: closure mode support, architecture reference structure enhancements, user custom function resource support

  - Closure Mode Support: Comprehensive modifications have been made to add support for closure mode. These include updates to the SDK for various cloud platforms, enhancing the deducer's closure analysis capabilities, incorporating closure import statements in the generated IaC code, and more.
  - Architectural Reference Structure Enhancements: The architectural reference structure now includes closure items. The CLI, generator, and deducer have been adjusted to align with the updated architectural reference structure.
  - User Custom Function Resource: Support has been added for user custom function resources on Alicloud, AWS, and Kubernetes.
  - Documentation Updates: The documentation has been revised to reflect these changes.

### Patch Changes

- Updated dependencies [cc4fd80]
  - @plutolang/pluto-infra@0.3.0
  - @plutolang/pluto@0.3.0
  - @plutolang/base@0.3.0

## 0.2.10

### Patch Changes

- fe44c8e: chore(sdk): reformat the code to follow the norm
- Updated dependencies [fe44c8e]
  - @plutolang/pluto-infra@0.2.10
  - @plutolang/pluto@0.2.9
  - @plutolang/base@0.2.9

## 0.2.9

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource
- Updated dependencies [62a0009]
  - @plutolang/pluto-infra@0.2.9
  - @plutolang/pluto@0.2.8
  - @plutolang/base@0.2.8

## 0.2.8

### Patch Changes

- Updated dependencies [5ae1dec]
  - @plutolang/pluto-infra@0.2.8
  - @plutolang/pluto@0.2.7
  - @plutolang/base@0.2.7

## 0.2.7

### Patch Changes

- bf60683: enhance(adapter): split the adapter package
- Updated dependencies [bf60683]
  - @plutolang/pluto-infra@0.2.7
  - @plutolang/base@0.2.6
  - @plutolang/pluto@0.2.6

## 0.2.6 - Last version of @plutolang/adapters

### Patch Changes

- Updated dependencies [0d8fc6f]
  - @plutolang/base@0.2.5
  - @plutolang/pluto@0.2.5
  - @plutolang/pluto-infra@0.2.6

## 0.2.5

### Patch Changes

- 5736dc1: enhance: refactor the component apis
- 38eef8e: enhance: normalize the configuration models, including project and stack.
- Updated dependencies [5736dc1]
- Updated dependencies [38eef8e]
  - @plutolang/base@0.2.4
  - @plutolang/pluto@0.2.4
  - @plutolang/pluto-infra@0.2.5

## 0.2.4

### Patch Changes

- 3401159: feat: support simulation test
- Updated dependencies [3401159]
  - @plutolang/pluto-infra@0.2.4
  - @plutolang/pluto@0.2.3
  - @plutolang/base@0.2.3

## 0.2.3

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS
- Updated dependencies [c2bcfb6]
  - @plutolang/base@0.2.2

## 0.2.2

### Patch Changes

- cf2a147: fix(adapter): check for incorrect AliCloud environment variables

## 0.2.1

### Patch Changes

- a5539e6: feat: support for AliCloud's ApiGateway and FC
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

- 1356132: Enable users to deploy without AWS CLI
- Updated dependencies [055b3c7]
  - @plutolang/base@0.1.0

## 0.0.3

### Patch Changes

- 4247f22: Switch to local backend in Pulumi.

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
