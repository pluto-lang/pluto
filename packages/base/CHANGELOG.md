# @plutolang/base

## 0.4.10

### Patch Changes

- dbbfde4: feat: update resource ID generation to handle Unicode characters

  The resource ID generation logic has been updated in both Python and TypeScript files to handle Unicode characters. This ensures that Unicode characters are properly encoded in the resource ID string, preventing any issues with special characters. The `encode_unicode` function has been added to both files to handle the encoding. This improvement enhances the reliability and compatibility of the resource ID generation process.

## 0.4.9

### Patch Changes

- 8f0e48d: fix: resolve topo sort failure by adding missing resource edge

  The topological sort was wrong due to a missing edge related to the resource argument. This commit adds the required edge to ensure correct sorting order.

## 0.4.8

### Patch Changes

- c8dfa7a: fix(base): fix project configs dumping issue

  Resolved a bug where the configs of a project were not being dumped.

## 0.4.7

### Patch Changes

- b277a26: feat(deducer): add support for custom runtime adapter

  Add functionality to handle a custom adapter in the stack configuration.

  When the 'provision type' option is set to 'Custom', users are now prompted to enter the name of their adapter package. Once supplied, it is included in the project's configuration, enabling the use of a bespoke adapter.

## 0.4.6

### Patch Changes

- 4e5b0b1: feat(base): add extraConfigs attribute for project-level config support

  Introduced an extraConfigs attribute in core components to enable additional project-level configurations.

## 0.4.5

### Patch Changes

- 6f75db8: refactor(base): refactor architecture reference data structure

  Refine the argument type for adding resources to capture property types, clarifying usage. Redefine the three Relationship types for improved code readability and to clarify resource relationships across various scenarios.

- 339dcfb: feat(base): add type attribute to topology sort results

  The topology sort previously returned a list of Entity instances, including Resource, Closure, and Relationship types. Processing these required type-checking each entity via attribute comparison, which was cumbersome and error-prone.

  This commit introduces a 'type' attribute to the topology sort's output, distinguishing between 'resource', 'bundle', and 'relationship'. This enhancement simplifies entity processing and increases code safety.

## 0.4.4

### Patch Changes

- 87f35b5: feat: enable runtime access to locally defined env vars

  Previously, environment variables were only accessible through the resource constructor and infrastructure APIs. This commit enables client APIs to access these variables.

  During function argument extraction by the deducer from the resource constructor or infrastructure APIs, all accessed environment variables within the compute closure are recorded. These variables are then passed to the architecture reference. Subsequently, the generator declares these environment variables for each closure variable in the IaC code. When the adapter runs the IaC code, it sets up the environment variables for the built function instance, such as AWS Lambda instances. The procedure of setting up these environment variables is written in the infrastructure SDK.

## 0.4.3

### Patch Changes

- 0a01098: fix(base): prevent duplicate relationships in arch ref

  Previously, adding a relationship to the arch ref object didn't check for existing identical relationships, leading to duplicates. Now, it verifies if the same relationship already exists in the object and prevents adding it again if found.

## 0.4.2

### Patch Changes

- 8819258: fix(generator): failed to generate iac code due to missing type information in webpack

## 0.4.1

### Patch Changes

- 2a0a874: fix(sdk): generating inconsistent resource id between python and typescript

## 0.4.0

### Minor Changes

- 1c3c5fa: feat: python support, validated with quickstart

  We created a deducer using Pyright. It can automatically analyze the dependent packages for each section of business logic, and the adapter includes them in the zip archive for publishing on AWS Lambda.

  Currently, Pluto supports simple Python projects. Users can use the pluto command to create and deploy Python projects. However, if the project relies on packages with different distribution packages on various platforms, or if the archive size after zipping exceeds the AWS limit of 50 MB, it will fail.

  For more details, you can find in the PRs related to the issue https://github.com/pluto-lang/pluto/issues/146 .

### Patch Changes

- 11ecc36: feat: support python workflow

## 0.3.1

### Patch Changes

- d285a49: Feature: refactor Pluto's output management

  Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

## 0.3.0

### Minor Changes

- cc4fd80: feat: closure mode support, architecture reference structure enhancements, user custom function resource support

  - Closure Mode Support: Comprehensive modifications have been made to add support for closure mode. These include updates to the SDK for various cloud platforms, enhancing the deducer's closure analysis capabilities, incorporating closure import statements in the generated IaC code, and more.
  - Architectural Reference Structure Enhancements: The architectural reference structure now includes closure items. The CLI, generator, and deducer have been adjusted to align with the updated architectural reference structure.
  - User Custom Function Resource: Support has been added for user custom function resources on Alicloud, AWS, and Kubernetes.
  - Documentation Updates: The documentation has been revised to reflect these changes.

## 0.2.9

### Patch Changes

- fe44c8e: chore(sdk): reformat the code to follow the norm

## 0.2.8

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource

## 0.2.7

### Patch Changes

- 5ae1dec: feat: support for transfering the values generated by compile-time to runtime

  Note: it hasn't supported for simulation testing yet, but it already can be used on the cloud platform.

## 0.2.6

### Patch Changes

- bf60683: enhance(adapter): split the adapter package

## 0.2.5

### Patch Changes

- 0d8fc6f: fix: the directory does not exist when generating initial files
  fix: cannot destroy before successfully deploying
  fix: the configuration file format does not adapt the latest version

## 0.2.4

### Patch Changes

- 5736dc1: enhance: refactor the component apis
- 38eef8e: enhance: normalize the configuration models, including project and stack.

## 0.2.3

### Patch Changes

- 3401159: feat: support simulation test

## 0.2.2

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS

## 0.2.1

### Patch Changes

- a5539e6: feat: support for AliCloud's ApiGateway and FC

## 0.2.0

### Minor Changes

- 505de47: https://github.com/pluto-lang/pluto/releases/tag/v0.2.0

## 0.1.1

### Patch Changes

- de25ad5: feat(deducer,generator): support accessing the constants that located outside of the function scope"

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

## 0.0.2

### Patch Changes

- rename @pluto to @plutolang

## 0.0.1

### Patch Changes

- first release
