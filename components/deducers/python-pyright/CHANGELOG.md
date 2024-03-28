# @plutolang/pyright-deducer

## 0.1.2

### Patch Changes

- 5f3abe1: fix(deducer): failed to bundle the dependencies of pyright-internal when publishing pyright-deducer

  Before, we used the `bundleDependencies` option to bundle the dependencies of `pyright-internal` when publishing `pyright-deducer`. However, it failed to include the dependencies of `pyright-internal` when publishing `pyright-deducer`. So, we opted to utilize webpack to bundle the entire `pyright-deducer` package along with all its dependencies, including `pyright-internal` and its dependencies.

  Because webpack bundles each dependency of `pyright-deducer` into a single file, if we attempt to verify whether an instance of PyrightDeducer from `pyright-deducer` is an instance of Deducer from `@plutolang/base`, we will receive a false result. Therefore, we should check for the existence of the `deduce` method instead.

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
