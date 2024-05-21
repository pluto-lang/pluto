# @plutolang/pyright-deducer

## 0.1.13

### Patch Changes

- 7f2e28c: fix(deducer): fix missed extraction of environment variables for functions, lambdas, and classes

  Missed the extraction of environment variables when accessed inside the body of functions, lambdas, and classes. This fix addresses the issue by checking the dependent environment variables, during searching the outside variables used within these node types.

## 0.1.12

### Patch Changes

- 5dd7c89: feat(deducer): support more situations for resource constructor and infra api args

  This update enhances the deducer module by allowing environment variables and variables to be passed to resource constructors and infra API arguments. Specifically, it now supports:

  - Direct literal values (e.g., `1`, `true`, `"hello"`).
  - Direct dataclass constructors (e.g., `Model(name="hello")` where `Model` is a dataclass).
  - Direct access to environment variables (e.g., `os.environ["key"]`, `os.environ.get("key", "default")`).
  - Variables (e.g., `var1`, `var2`), with the requirement that they are defined exactly once and assigned with the supported value types.
  - Tuples or dicts containing the supported types of values.

- 87f35b5: feat: enable runtime access to locally defined env vars

  Previously, environment variables were only accessible through the resource constructor and infrastructure APIs. This commit enables client APIs to access these variables.

  During function argument extraction by the deducer from the resource constructor or infrastructure APIs, all accessed environment variables within the compute closure are recorded. These variables are then passed to the architecture reference. Subsequently, the generator declares these environment variables for each closure variable in the IaC code. When the adapter runs the IaC code, it sets up the environment variables for the built function instance, such as AWS Lambda instances. The procedure of setting up these environment variables is written in the infrastructure SDK.

- Updated dependencies [87f35b5]
  - @plutolang/base@0.4.4

## 0.1.11

### Patch Changes

- b3400ad: feat(deducer): allow using direct captured properties as arguments in infra API

  This change introduces the ability to use direct captured properties as arguments in infrastructure API calls. For instance, the code below is now considered valid:

  ```python
  from pluto_client import Website, Router

  router = Router("router")
  website = Website(path="path/to/website", name="website")

  website.addEnv("ROUTER", router.url())
  ```

  In this example, `router.url()` is a direct captured property which the website utilizes to establish a connection to the backend service.

  The goal is for the infrastructure API to accept both direct captured properties and variables assigned with these properties, as demonstrated here:

  ```python
  from pluto_client import Website, Router

  router = Router("router")
  website = Website(path="path/to/website", name="website")

  router_url = router.url()
  website.addEnv("ROUTER", router_url)
  ```

  Currently, the API only accepts direct captured properties as arguments. Future updates will include support for variables that store the return values of these properties.

## 0.1.10

### Patch Changes

- e9a1551: fix: skip dependency installation even if the last install failed

  Previously, the installation process overlooked the `done` flag in the metadata, causing it to skip installing dependencies even if the last attempt failed, as long as the dependencies were the same as those previously identified.

- 8db533e: feat(deducer): dynamically obtain resource type FQN from class definition

  Previously, the process of obtaining the fully qualified name (FQN) of a resource type was based on a hard-coded package name during deducing. This approach has been updated to leverage a `fqn` member variable present within the resource type class definition itself, thus avoiding the need for hard-coding.

- 58e6359: feat(deducer): fix the name of extracted bundle

  Previously, the name of the extracted bundle was determined by the entrypoint's position in the source code, leading to frequent changes and unnecessary reinstallation of dependent packages. This process was both time-consuming and network-intensive. Now, the naming convention relies on the associated resource's name, method name, and the name and index of the parameter corresponding to the bundle's entrypoint, enhancing stability.

## 0.1.9

### Patch Changes

- 023e0e2: feat(deducer): support the intrinsic declaration type during Python code extraction

  This change introduces support for intrinsic declaration types such as `__name__` and `__file__` during the Python code extraction process.

## 0.1.8

### Patch Changes

- bc6b168: feat(deducer): support extracting format string in Python

  Previously, when the pyright deducer encountered a StringList node, it would only extract the string directly. However, for format strings that depend on variables, this approach was insufficient. This update allows the deducer to extract both the format string and its associated variables from the node.

- a232931: fix(deducer): fix package installation with mismatched module names

  Previously, the pyright deducer used the imported module name for package installation, causing failures for modules like `faiss`, which is imported as `faiss` but the package name is `faiss-cpu`.

  Now, it will search all dist-info directories, constructing package information from metadata and top-level.txt files. This establishes the relationship between installed package names and imported module names, resolving the installation issue.

- Updated dependencies [0a01098]
  - @plutolang/base@0.4.3

## 0.1.7

### Patch Changes

- 4d74eb6: fix(deducer): correct exportName setting for multiline export statements

  This commit addresses an issue where errors occur when setting the exportName for export statements that contain line breaks. The issue arises particularly when the export statement is a function call, lambda expression, or similar, and spans multiple lines.

  Previously, the strategy was to assign the last line of the statement to the exportName, which proved to be incorrect for multiline statements. This commit changes that approach to assign the entire statement to the exportName, if the statement spans multiple lines.

  Consider the following function call, where the second argument is the statement we want to export:

  ```python
  router.all("/*", lambda *args, **kwargs: Mangum(return_fastapi_app(),
                                                  api_gateway_base_path="/dev")(*args, **kwargs), raw=True)
  ```

  Before this fix, the assignment would look like this:

  ```python
  lambda *args, **kwargs: Mangum(return_fastapi_app(),
  exportName                                                api_gateway_base_path="/dev")(*args, **kwargs)
  ```

  After this fix, the assignment is as follows:

  ```python
  exportName = lambda *args, **kwargs: Mangum(return_fastapi_app(),
                                                  api_gateway_base_path="/dev")(*args, **kwargs)
  ```

## 0.1.6

### Patch Changes

- bfded23: feat(deducer): expand support for python runtimes

  Recognizing that the Python runtime on a developer's device may not always be 'python3.10', we have extended our support to include a broader range of Python runtimes. The updated requirements now stipulate that the Python runtime should be 'python3.8' or higher, but not exceeding 'python3.12'.

## 0.1.5

### Patch Changes

- f77412f: fix(deducer): refactor code extraction to handle resource object creation

## 0.1.4

### Patch Changes

- f4b7b8e: feat(deducer): support extracting dependent code from binary operations and list comprehensions

  Binary operations and list comprehensions are common in Python code. LangChain uses binary operations as its LCEL. Therefore, it's important to support extracting the dependent code from binary operations and list comprehensions.

  The process of extracting binary operations and list comprehensions is similar to extracting other nodes. It involves recursively extracting child expressions, using the source code as the extracted code, and adding the dependent declarations of the child expressions to the extraction result.

  There's another small tweak in the code. We've added the `uselessFilesPatterns` option to the `bundleModules` function, enabling to define which file patterns to delete during module bundling. By default, `.pyc`, `__pycache__`, and `dist-info` files will be deleted. However, LangChain requires the `pydantic` metadata files within the `dist-info` directory. Therefore, we now specify the `uselessFilesPatterns` option for `.pyc` and `__pycache__` only.

## 0.1.3

### Patch Changes

- Updated dependencies [8819258]
  - @plutolang/base@0.4.2

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
