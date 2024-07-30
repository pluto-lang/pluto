# @plutolang/simulator-adapter

## 0.3.32

### Patch Changes

- Updated dependencies [24186fd]
- Updated dependencies [6895856]
  - @plutolang/pluto-infra@0.4.26
  - @plutolang/pluto@0.4.17

## 0.3.31

### Patch Changes

- bdea514: feat(simulator): set default port and enable direct client API invocation

  Set simulator's default port to 9001 to standardize the starting point.

  Enable invocation of client APIs through simulator API formatted as `http://<simulator_url>/<resource_id>/<method>`. This allows users to test client APIs directly using curl, simplifying the testing process.

## 0.3.30

### Patch Changes

- Updated dependencies [8f0e48d]
  - @plutolang/base@0.4.9
  - @plutolang/pluto@0.4.16
  - @plutolang/pluto-infra@0.4.25

## 0.3.29

### Patch Changes

- Updated dependencies [c8dfa7a]
  - @plutolang/base@0.4.8
  - @plutolang/pluto@0.4.15
  - @plutolang/pluto-infra@0.4.24

## 0.3.28

### Patch Changes

- b277a26: feat(deducer): add support for custom runtime adapter

  Add functionality to handle a custom adapter in the stack configuration.

  When the 'provision type' option is set to 'Custom', users are now prompted to enter the name of their adapter package. Once supplied, it is included in the project's configuration, enabling the use of a bespoke adapter.

- Updated dependencies [b277a26]
  - @plutolang/base@0.4.7
  - @plutolang/pluto@0.4.14
  - @plutolang/pluto-infra@0.4.23

## 0.3.27

### Patch Changes

- Updated dependencies [4e5b0b1]
  - @plutolang/base@0.4.6
  - @plutolang/pluto@0.4.13
  - @plutolang/pluto-infra@0.4.22

## 0.3.26

### Patch Changes

- Updated dependencies [a11206f]
  - @plutolang/pluto-infra@0.4.21

## 0.3.25

### Patch Changes

- 96c6609: fix(adapter): correct parsing error for complex JSON values

  The current implementation uses `eval` to parse values that may include `process.env`. However, `eval` throws errors when parsing complex JSON structures. This commit resolves the issue by creating a string that assigns the value to a variable and subsequently returns the variable, which `eval` can then parse without errors.

## 0.3.24

### Patch Changes

- 6f75db8: refactor(base): refactor architecture reference data structure

  Refine the argument type for adding resources to capture property types, clarifying usage. Redefine the three Relationship types for improved code readability and to clarify resource relationships across various scenarios.

- 339dcfb: feat(base): add type attribute to topology sort results

  The topology sort previously returned a list of Entity instances, including Resource, Closure, and Relationship types. Processing these required type-checking each entity via attribute comparison, which was cumbersome and error-prone.

  This commit introduces a 'type' attribute to the topology sort's output, distinguishing between 'resource', 'bundle', and 'relationship'. This enhancement simplifies entity processing and increases code safety.

- Updated dependencies [6f75db8]
- Updated dependencies [339dcfb]
  - @plutolang/base@0.4.5
  - @plutolang/pluto@0.4.12
  - @plutolang/pluto-infra@0.4.20

## 0.3.23

### Patch Changes

- Updated dependencies [e761342]
  - @plutolang/pluto-infra@0.4.19

## 0.3.22

### Patch Changes

- adc87b9: feat(adapter): enable Python execution in simulator

  This commit introduces the ability to execute Python within the simulator. It also adds support for parsing arguments that access captured properties or environment variables.

- Updated dependencies [adc87b9]
  - @plutolang/pluto-infra@0.4.18

## 0.3.21

### Patch Changes

- Updated dependencies [7cfe152]
  - @plutolang/pluto-infra@0.4.17

## 0.3.20

### Patch Changes

- Updated dependencies [9c86635]
  - @plutolang/pluto-infra@0.4.16
  - @plutolang/pluto@0.4.11

## 0.3.19

### Patch Changes

- Updated dependencies [e34d204]
  - @plutolang/pluto-infra@0.4.15
  - @plutolang/pluto@0.4.10

## 0.3.18

### Patch Changes

- Updated dependencies [c36a239]
- Updated dependencies [87f35b5]
  - @plutolang/pluto-infra@0.4.14
  - @plutolang/pluto@0.4.9
  - @plutolang/base@0.4.4

## 0.3.17

### Patch Changes

- Updated dependencies [e58e6d2]
- Updated dependencies [93a0d4b]
  - @plutolang/pluto-infra@0.4.13
  - @plutolang/pluto@0.4.8

## 0.3.16

### Patch Changes

- Updated dependencies [ef557b1]
  - @plutolang/pluto-infra@0.4.12
  - @plutolang/pluto@0.4.7

## 0.3.15

### Patch Changes

- Updated dependencies [52cd794]
  - @plutolang/pluto-infra@0.4.11
  - @plutolang/pluto@0.4.6

## 0.3.14

### Patch Changes

- Updated dependencies [89bd3fc]
  - @plutolang/pluto-infra@0.4.10

## 0.3.13

### Patch Changes

- Updated dependencies [c9050c3]
- Updated dependencies [0a01098]
  - @plutolang/pluto-infra@0.4.9
  - @plutolang/pluto@0.4.5
  - @plutolang/base@0.4.3

## 0.3.12

### Patch Changes

- Updated dependencies [6859583]
  - @plutolang/pluto-infra@0.4.8

## 0.3.11

### Patch Changes

- Updated dependencies [aa14b9c]
  - @plutolang/pluto-infra@0.4.7

## 0.3.10

### Patch Changes

- Updated dependencies [bfded23]
  - @plutolang/pluto-infra@0.4.6

## 0.3.9

### Patch Changes

- Updated dependencies [ea28a84]
  - @plutolang/pluto-infra@0.4.5

## 0.3.8

### Patch Changes

- Updated dependencies [569cfcb]
  - @plutolang/pluto-infra@0.4.4
  - @plutolang/pluto@0.4.4

## 0.3.7

### Patch Changes

- Updated dependencies [8819258]
  - @plutolang/base@0.4.2
  - @plutolang/pluto@0.4.3
  - @plutolang/pluto-infra@0.4.3

## 0.3.6

### Patch Changes

- Updated dependencies [2a0a874]
  - @plutolang/base@0.4.1
  - @plutolang/pluto@0.4.2
  - @plutolang/pluto-infra@0.4.2

## 0.3.5

### Patch Changes

- Updated dependencies [daa6ef9]
- Updated dependencies [daa6ef9]
  - @plutolang/pluto-infra@0.4.1
  - @plutolang/pluto@0.4.1

## 0.3.4

### Patch Changes

- Updated dependencies [1c3c5fa]
- Updated dependencies [11ecc36]
  - @plutolang/pluto-infra@0.4.0
  - @plutolang/pluto@0.4.0
  - @plutolang/base@0.4.0

## 0.3.3

### Patch Changes

- d285a49: Feature: refactor Pluto's output management

  Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

- Updated dependencies [d285a49]
  - @plutolang/pluto-infra@0.3.3
  - @plutolang/base@0.3.1
  - @plutolang/pluto@0.3.3

## 0.3.2

### Patch Changes

- Updated dependencies [a94e19b]
  - @plutolang/pluto-infra@0.3.2
  - @plutolang/pluto@0.3.2

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
