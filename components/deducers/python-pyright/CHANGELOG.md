# @plutolang/pyright-deducer

## 0.1.1

### Patch Changes

- 1ca8e3c: feat: using `pip install` to bundle dependencies instead of copying local packages

  When creating the Lambda deployment package, it's essential to bundle dependencies. Previously, we built the dependency graph for a single closure, identified the directories containing the dependent packages, and copied them into the deployment package. However, this approach struggles with cross-architecture deployment and may include unnecessary files.

  Now, we utilize `pip install` to install directly dependent packages for a closure. If the target runtime or architecture differs from the local environment, we employ Docker to handle dependency installation before packaging. While this method offers greater reliability, it's slower compared to the previous approach.

- Updated dependencies [2a0a874]
  - @plutolang/base@0.4.1

## 0.1.0

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
