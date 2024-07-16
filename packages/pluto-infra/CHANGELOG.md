# @plutolang/pluto-infra

## 0.4.24

### Patch Changes

- Updated dependencies [c8dfa7a]
  - @plutolang/base@0.4.8
  - @plutolang/pluto@0.4.15

## 0.4.23

### Patch Changes

- Updated dependencies [b277a26]
  - @plutolang/base@0.4.7
  - @plutolang/pluto@0.4.14

## 0.4.22

### Patch Changes

- Updated dependencies [4e5b0b1]
  - @plutolang/base@0.4.6
  - @plutolang/pluto@0.4.13

## 0.4.21

### Patch Changes

- a11206f: feat(deducer): enable relative imports for local modules

  Users can now perform relative imports of local modules within the app directory. The Pyright deducer has been updated to copy these modules to the root of each bundle directory for seamless integration.

## 0.4.20

### Patch Changes

- Updated dependencies [6f75db8]
- Updated dependencies [339dcfb]
  - @plutolang/base@0.4.5
  - @plutolang/pluto@0.4.12

## 0.4.19

### Patch Changes

- e761342: fix(sdk): correct `express` dependency classification

  This commit addresses an error where `express` was incorrectly included in dev-dependencies instead of dependencies.

## 0.4.18

### Patch Changes

- adc87b9: The resource infrastructure SDK implementation has been updated to adhere to the IResourceInfra interface, unifying the implementation for both local and cloud environments. Additionally, the Website resource type is now supported in the simulator environment.

## 0.4.17

### Patch Changes

- 7cfe152: feat(cli): add `logs` command

## 0.4.16

### Patch Changes

- 9c86635: feat(sdk): add Vercel deployment for ReactApp and Website

  Enable deployment of static websites and compiled React applications to Vercel.

- Updated dependencies [9c86635]
  - @plutolang/pluto@0.4.11

## 0.4.15

### Patch Changes

- e34d204: feat(sdk): add ReactApp resource type

  Adds ReactApp resource type to support building and deploying React applications.

- Updated dependencies [e34d204]
  - @plutolang/pluto@0.4.10

## 0.4.14

### Patch Changes

- c36a239: feat(sdk): add `Secret` resource type
- 87f35b5: feat: enable runtime access to locally defined env vars

  Previously, environment variables were only accessible through the resource constructor and infrastructure APIs. This commit enables client APIs to access these variables.

  During function argument extraction by the deducer from the resource constructor or infrastructure APIs, all accessed environment variables within the compute closure are recorded. These variables are then passed to the architecture reference. Subsequently, the generator declares these environment variables for each closure variable in the IaC code. When the adapter runs the IaC code, it sets up the environment variables for the built function instance, such as AWS Lambda instances. The procedure of setting up these environment variables is written in the infrastructure SDK.

- Updated dependencies [c36a239]
- Updated dependencies [87f35b5]
  - @plutolang/pluto@0.4.9
  - @plutolang/base@0.4.4

## 0.4.13

### Patch Changes

- e58e6d2: feat(sdk): add Website resource type
- 93a0d4b: chore(sdk): upgrade @pulumi/aws to support Python 3.12 in Lambda

  Upgraded `@pulumi/aws` version from 6.4.1 to 6.34.1 to ensure compatibility with the Python 3.12 runtime in AWS Lambda functions.

- Updated dependencies [e58e6d2]
  - @plutolang/pluto@0.4.8

## 0.4.12

### Patch Changes

- ef557b1: feat(sdk): include the `raw` option in the Function constructor

  Add the `raw` option to the Function constructor. When set to `true`, it ensures the function doesn't wrap the adapter provided by the SDK developer, allowing raw data from the platform to be sent directly to the function handler.

- Updated dependencies [ef557b1]
  - @plutolang/pluto@0.4.7

## 0.4.11

### Patch Changes

- 52cd794: feat(sdk): move name option to separate argument in Function constructor

  Moved the `name` option from the `options` argument to a separate `name` argument in the `Function` constructor. This change allows the deducer to correctly identify the name of the `Function` resource object.

- Updated dependencies [52cd794]
  - @plutolang/pluto@0.4.6

## 0.4.10

### Patch Changes

- 89bd3fc: feat(infra sdk): enable forceDestroy for S3 bucket removal

  After enabling the forceDestroy option, the S3 bucket will be removed even if it is not empty.

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
