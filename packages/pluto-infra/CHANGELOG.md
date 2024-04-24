# @plutolang/pluto-infra

## 0.4.9

### Patch Changes

- c9050c3: feat(sdk): add bucket resource type, modify the schedule, function resource type

  - Bucket resource type added, currently only supports AWS S3.
  - Schedule resource type adapted for Python, enabling periodic tasks such as rebuilding the vector store for RAG applications.
  - Function resource type now includes a `memory` option to specify instance memory size.

- Updated dependencies [c9050c3]
- Updated dependencies [0a01098]
  - @plutolang/pluto@0.4.5
  - @plutolang/base@0.4.3

## 0.4.8

### Patch Changes

- 6859583: fix(sdk): pulumi serialization issue with pluto-info package

  Deploying the pluto application on Kubernetes works locally, but fails in container environments where packages are fetched from the npm registry instead of being built locally. This failure is due to pulumi not serializing the imported package correctly. In the dev environment, serialization includes all imported package code, but in containers, it only generates a require statement, causing the application to fail.

  To resolve this, I adapted a serialization method that was previously implemented for Python, creating an adapter file for each resource. Then, wrapping functions from the business layer to the adapter, then to the base runtime function, in sequence. These files are then bundled according to dependency hierarchy into a directory, from which an image is built and deployed to Kubernetes.

## 0.4.7

### Patch Changes

- aa14b9c: feat(adapter,sdk): allow custom registry URL and platform for application deployment on K8s

## 0.4.6

### Patch Changes

- bfded23: feat(deducer): expand support for python runtimes

  Recognizing that the Python runtime on a developer's device may not always be 'python3.10', we have extended our support to include a broader range of Python runtimes. The updated requirements now stipulate that the Python runtime should be 'python3.8' or higher, but not exceeding 'python3.12'.

## 0.4.5

### Patch Changes

- ea28a84: feat(sdk): get aws region from pulumi stack configuration

## 0.4.4

### Patch Changes

- 569cfcb: feat(sdk): add `all` route function to router class

  Introduces a new method to the router class, enabling users to specify a route that matches all HTTP methods. Additionally, this function includes a 'raw' parameter, indicating that the route won't undergo parsing by the SDK. Instead, the raw HTTP request will be forwarded directly to the handler. This is beneficial for users who prefer to handle HTTP request routing independently.

- Updated dependencies [569cfcb]
  - @plutolang/pluto@0.4.4

## 0.4.3

### Patch Changes

- Updated dependencies [8819258]
  - @plutolang/base@0.4.2
  - @plutolang/pluto@0.4.3

## 0.4.2

### Patch Changes

- Updated dependencies [2a0a874]
  - @plutolang/base@0.4.1
  - @plutolang/pluto@0.4.2

## 0.4.1

### Patch Changes

- daa6ef9: enhance(sdk): remove the fuzzyArn, instead use the lazy value from pulumi.
- Updated dependencies [daa6ef9]
  - @plutolang/pluto@0.4.1

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
  - @plutolang/pluto@0.4.0
  - @plutolang/base@0.4.0

## 0.3.3

### Patch Changes

- d285a49: Feature: refactor Pluto's output management

  Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

- Updated dependencies [d285a49]
  - @plutolang/base@0.3.1
  - @plutolang/pluto@0.3.3

## 0.3.2

### Patch Changes

- a94e19b: feat(sdk): add a captured property `url` to resource type `function`
- Updated dependencies [a94e19b]
  - @plutolang/pluto@0.3.2

## 0.3.1

### Patch Changes

- e2aa07b: feat(sdk): support aws sagemaker
- Updated dependencies [e2aa07b]
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
  - @plutolang/pluto@0.3.0
  - @plutolang/base@0.3.0

## 0.2.10

### Patch Changes

- fe44c8e: chore(sdk): reformat the code to follow the norm
- Updated dependencies [fe44c8e]
  - @plutolang/pluto@0.2.9
  - @plutolang/base@0.2.9

## 0.2.9

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource
- Updated dependencies [62a0009]
  - @plutolang/pluto@0.2.8
  - @plutolang/base@0.2.8

## 0.2.8

### Patch Changes

- 5ae1dec: feat: support for transfering the values generated by compile-time to runtime

  Note: it hasn't supported for simulation testing yet, but it already can be used on the cloud platform.

- Updated dependencies [5ae1dec]
  - @plutolang/pluto@0.2.7
  - @plutolang/base@0.2.7

## 0.2.7

### Patch Changes

- bf60683: enhance(adapter): split the adapter package
- Updated dependencies [bf60683]
  - @plutolang/base@0.2.6
  - @plutolang/pluto@0.2.6

## 0.2.6

### Patch Changes

- Updated dependencies [0d8fc6f]
  - @plutolang/base@0.2.5
  - @plutolang/pluto@0.2.5

## 0.2.5

### Patch Changes

- Updated dependencies [5736dc1]
- Updated dependencies [38eef8e]
  - @plutolang/base@0.2.4
  - @plutolang/pluto@0.2.4

## 0.2.4

### Patch Changes

- 3401159: feat: support simulation test
- Updated dependencies [3401159]
  - @plutolang/pluto@0.2.3
  - @plutolang/base@0.2.3

## 0.2.3

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS
- Updated dependencies [c2bcfb6]
  - @plutolang/pluto@0.2.2
  - @plutolang/base@0.2.2

## 0.2.2

### Patch Changes

- 8617830: fix(sdk): incorrect http response format

## 0.2.1

### Patch Changes

- a5539e6: feat: support for AliCloud's ApiGateway and FC
- Updated dependencies [a5539e6]
  - @plutolang/pluto@0.2.1
  - @plutolang/base@0.2.1

## 0.2.0

### Minor Changes

- 505de47: https://github.com/pluto-lang/pluto/releases/tag/v0.2.0

### Patch Changes

- Updated dependencies [505de47]
  - @plutolang/base@0.2.0
  - @plutolang/pluto@0.2.0

## 0.1.2

### Patch Changes

- Updated dependencies [de25ad5]
  - @plutolang/base@0.1.1
  - @plutolang/pluto@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [e587e81]
  - @plutolang/pluto@0.1.1

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

### Patch Changes

- Updated dependencies [055b3c7]
  - @plutolang/base@0.1.0
  - @plutolang/pluto@0.1.0

## 0.0.5

### Patch Changes

- Updated dependencies [45786dd]
  - @plutolang/pluto@0.0.4

## 0.0.4

### Patch Changes

- a8c9dec: Fix: unify the response from AWS and K8s.
  Fix: set the empty map as the default value of Request.query.

## 0.0.3

### Patch Changes

- c504f5b: Support schedule resource on AWS and K8s.
- Updated dependencies [c504f5b]
  - @plutolang/pluto@0.0.3

## 0.0.2

### Patch Changes

- rename @pluto to @plutolang
- Updated dependencies
  - @plutolang/pluto@0.0.2
  - @plutolang/base@0.0.2

## 0.0.1

### Patch Changes

- first release
- Updated dependencies
  - @pluto/pluto@0.0.1
  - @pluto/base@0.0.1
