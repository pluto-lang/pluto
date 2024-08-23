# @plutolang/pluto

## 0.4.20

### Patch Changes

- 03f1602: feat(sdk): add support for configuring host and port for website resource

  This change introduces the ability to specify custom host and port settings for website resources, enhancing flexibility during local development.

- ee30573: feat(sdk): add support for configuring host and port for router resource

  This change introduces the ability to specify custom host and port settings for router resources, enhancing flexibility during local development.

## 0.4.19

### Patch Changes

- cdf966f: feat(sdk): remove runtime dependency for AWS account ID retrieval

  The previous AWS queue resource type implementation required the `AWS_ACCOUNT_ID` environment variable to be set by the runtime handler. The setting only occurred upon receiving a request, causing a panic if the queue resource type was used globally without the `AWS_ACCOUNT_ID` being set.

  This commit eliminates the need for runtime setting of `AWS_ACCOUNT_ID` by utilizing the `sts.GetCallerIdentity` API to retrieve the account ID.

## 0.4.18

### Patch Changes

- Updated dependencies [dbbfde4]
  - @plutolang/base@0.4.10

## 0.4.17

### Patch Changes

- 24186fd: feat(sdk): add CORS support for AWS ApiGateway

## 0.4.16

### Patch Changes

- Updated dependencies [8f0e48d]
  - @plutolang/base@0.4.9

## 0.4.15

### Patch Changes

- Updated dependencies [c8dfa7a]
  - @plutolang/base@0.4.8

## 0.4.14

### Patch Changes

- Updated dependencies [b277a26]
  - @plutolang/base@0.4.7

## 0.4.13

### Patch Changes

- Updated dependencies [4e5b0b1]
  - @plutolang/base@0.4.6

## 0.4.12

### Patch Changes

- Updated dependencies [6f75db8]
- Updated dependencies [339dcfb]
  - @plutolang/base@0.4.5

## 0.4.11

### Patch Changes

- 9c86635: feat(sdk): add Vercel deployment for ReactApp and Website

  Enable deployment of static websites and compiled React applications to Vercel.

## 0.4.10

### Patch Changes

- e34d204: feat(sdk): add ReactApp resource type

  Adds ReactApp resource type to support building and deploying React applications.

## 0.4.9

### Patch Changes

- c36a239: feat(sdk): add `Secret` resource type
- Updated dependencies [87f35b5]
  - @plutolang/base@0.4.4

## 0.4.8

### Patch Changes

- e58e6d2: feat(sdk): add Website resource type

## 0.4.7

### Patch Changes

- ef557b1: feat(sdk): include the `raw` option in the Function constructor

  Add the `raw` option to the Function constructor. When set to `true`, it ensures the function doesn't wrap the adapter provided by the SDK developer, allowing raw data from the platform to be sent directly to the function handler.

## 0.4.6

### Patch Changes

- 52cd794: feat(sdk): move name option to separate argument in Function constructor

  Moved the `name` option from the `options` argument to a separate `name` argument in the `Function` constructor. This change allows the deducer to correctly identify the name of the `Function` resource object.

## 0.4.5

### Patch Changes

- c9050c3: feat(sdk): add bucket resource type, modify the schedule, function resource type

  - Bucket resource type added, currently only supports AWS S3.
  - Schedule resource type adapted for Python, enabling periodic tasks such as rebuilding the vector store for RAG applications.
  - Function resource type now includes a `memory` option to specify instance memory size.

- Updated dependencies [0a01098]
  - @plutolang/base@0.4.3

## 0.4.4

### Patch Changes

- 569cfcb: feat(sdk): add `all` route function to router class

  Introduces a new method to the router class, enabling users to specify a route that matches all HTTP methods. Additionally, this function includes a 'raw' parameter, indicating that the route won't undergo parsing by the SDK. Instead, the raw HTTP request will be forwarded directly to the handler. This is beneficial for users who prefer to handle HTTP request routing independently.

## 0.4.3

### Patch Changes

- Updated dependencies [8819258]
  - @plutolang/base@0.4.2

## 0.4.2

### Patch Changes

- Updated dependencies [2a0a874]
  - @plutolang/base@0.4.1

## 0.4.1

### Patch Changes

- daa6ef9: feat(sdk): export the table name and partition key of the created dynamodb instance to users

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

## 0.3.3

### Patch Changes

- Updated dependencies [d285a49]
  - @plutolang/base@0.3.1

## 0.3.2

### Patch Changes

- a94e19b: feat(sdk): add a captured property `url` to resource type `function`

## 0.3.1

### Patch Changes

- e2aa07b: feat(sdk): support aws sagemaker

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

- fe44c8e: chore(sdk): reformat the code to follow the norm
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

- Updated dependencies [5736dc1]
- Updated dependencies [38eef8e]
  - @plutolang/base@0.2.4

## 0.2.3

### Patch Changes

- 3401159: feat: support simulation test
- Updated dependencies [3401159]
  - @plutolang/base@0.2.3

## 0.2.2

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS
- Updated dependencies [c2bcfb6]
  - @plutolang/base@0.2.2

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

## 0.1.2

### Patch Changes

- Updated dependencies [de25ad5]
  - @plutolang/base@0.1.1

## 0.1.1

### Patch Changes

- e587e81: feat(deducer): support dynamically detecting resource type

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

### Patch Changes

- Updated dependencies [055b3c7]
  - @plutolang/base@0.1.0

## 0.0.4

### Patch Changes

- 45786dd: fix(sdk): table name error in DynameDBKVStore set method

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
