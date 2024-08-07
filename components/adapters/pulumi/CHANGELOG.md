# @plutolang/pulumi-adapter

## 0.4.14

### Patch Changes

- Updated dependencies [dbbfde4]
  - @plutolang/base@0.4.10

## 0.4.13

### Patch Changes

- Updated dependencies [8f0e48d]
  - @plutolang/base@0.4.9

## 0.4.12

### Patch Changes

- Updated dependencies [c8dfa7a]
  - @plutolang/base@0.4.8

## 0.4.11

### Patch Changes

- Updated dependencies [b277a26]
  - @plutolang/base@0.4.7

## 0.4.10

### Patch Changes

- Updated dependencies [4e5b0b1]
  - @plutolang/base@0.4.6

## 0.4.9

### Patch Changes

- Updated dependencies [6f75db8]
- Updated dependencies [339dcfb]
  - @plutolang/base@0.4.5

## 0.4.8

### Patch Changes

- ebc2191: feat(adapter): automate Pulumi installation during adapter operation

  In this commit, we've added an automatic Pulumi installation step to the adapter operation. This ensures that if Pulumi is either not installed or not in the specified version or path, the adapter will automatically handle its installation.

## 0.4.7

### Patch Changes

- 7cfe152: feat(cli): add `logs` command

## 0.4.6

### Patch Changes

- 1e8f254: feat(adapter): prettify pulumi error output on AWS deployment
- Updated dependencies [87f35b5]
  - @plutolang/base@0.4.4

## 0.4.5

### Patch Changes

- c406bdf: feat(adapter): add `projectRoot` to Pulumi config for path resolution

  This commit adds the `projectRoot` setting to the Pulumi configuration by default. This feature improves the accuracy of relative path resolution for resource creation, like a Website. With the `projectRoot` available, the infra SDK can correctly resolve paths given by the user relative to the project's base directory. For instance, creating a Website resource with a path parameter relative to the project root is now possible as demonstrated:

  ```typescript
  const website = new Website("./public");
  ```

## 0.4.4

### Patch Changes

- Updated dependencies [0a01098]
  - @plutolang/base@0.4.3

## 0.4.3

### Patch Changes

- aa14b9c: feat(adapter,sdk): allow custom registry URL and platform for application deployment on K8s

## 0.4.2

### Patch Changes

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

- d285a49: Feature: refactor Pluto's output management

  Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

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

## 0.2.10

### Patch Changes

- fe44c8e: chore(sdk): reformat the code to follow the norm
- Updated dependencies [fe44c8e]
  - @plutolang/base@0.2.9

## 0.2.9

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource
- Updated dependencies [62a0009]
  - @plutolang/base@0.2.8

## 0.2.8

### Patch Changes

- Updated dependencies [5ae1dec]
  - @plutolang/base@0.2.7

## 0.2.7

### Patch Changes

- bf60683: enhance(adapter): split the adapter package
- Updated dependencies [bf60683]
  - @plutolang/base@0.2.6

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
