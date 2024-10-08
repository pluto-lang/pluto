# @plutolang/cli

## 0.4.61

### Patch Changes

- 3db055d: feat(deducer): configure local arch for pluto run on Mac

  Avoid unnecessary use of Docker for x86 pypi package downloads when executing pluto run on Mac. Previously, target architecture was set to x86 for all environments, leading to Docker usage on Mac. This change sets the target architecture to the local one during pluto run execution.

- Updated dependencies [3db055d]
  - @plutolang/pyright-deducer@0.1.37

## 0.4.60

### Patch Changes

- abc80a8: feat(simulator): support custom address configuration
- Updated dependencies [abc80a8]
  - @plutolang/simulator-adapter@0.3.38
  - @plutolang/static-deducer@0.4.13

## 0.4.59

### Patch Changes

- Updated dependencies [75e5a89]
  - @plutolang/simulator-adapter@0.3.37

## 0.4.58

### Patch Changes

- Updated dependencies [f6b3536]
- Updated dependencies [5e7702e]
  - @plutolang/pyright-deducer@0.1.36

## 0.4.57

### Patch Changes

- Updated dependencies [78a976b]
  - @plutolang/pyright-deducer@0.1.35

## 0.4.56

### Patch Changes

- Updated dependencies [c1c732e]
  - @plutolang/pyright-deducer@0.1.34

## 0.4.55

### Patch Changes

- Updated dependencies [e3d17b1]
  - @plutolang/pyright-deducer@0.1.33

## 0.4.54

### Patch Changes

- @plutolang/simulator-adapter@0.3.36

## 0.4.53

### Patch Changes

- @plutolang/simulator-adapter@0.3.35
- @plutolang/static-deducer@0.4.13

## 0.4.52

### Patch Changes

- 5a09178: chore(cli): update table alignment in deploy command

## 0.4.51

### Patch Changes

- faf87ff: fix(cli): replace `table` with `cli-table3` for better Unicode support

  Switched to `cli-table3` as it provides enhanced support for Unicode characters, which was lacking in the `table` package.

- Updated dependencies [c45700e]
- Updated dependencies [dbbfde4]
  - @plutolang/static-generator@0.4.10
  - @plutolang/base@0.4.10
  - @plutolang/pulumi-adapter@0.4.14
  - @plutolang/simulator-adapter@0.3.34
  - @plutolang/pyright-deducer@0.1.32
  - @plutolang/static-deducer@0.4.13
  - @plutolang/graphviz-generator@0.4.12

## 0.4.50

### Patch Changes

- 268f936: feat(cli): beautify deployment outputs
- 41c8538: feat(cli): add --live flag to pluto run for live reloading

  The --live flag has been introduced to the 'pluto run' command to enable live reloading.

  When this flag is active, it monitors file changes in the directory containing the entrypoint and automatically re-executes the project if any modifications are detected.

- Updated dependencies [41c8538]
  - @plutolang/simulator-adapter@0.3.33

## 0.4.49

### Patch Changes

- @plutolang/simulator-adapter@0.3.32
- @plutolang/static-deducer@0.4.12

## 0.4.48

### Patch Changes

- Updated dependencies [ed1918b]
  - @plutolang/pyright-deducer@0.1.31

## 0.4.47

### Patch Changes

- Updated dependencies [86cb072]
  - @plutolang/pyright-deducer@0.1.30

## 0.4.46

### Patch Changes

- Updated dependencies [bdea514]
  - @plutolang/simulator-adapter@0.3.31

## 0.4.45

### Patch Changes

- Updated dependencies [0d2f967]
- Updated dependencies [1a89ae8]
  - @plutolang/pyright-deducer@0.1.29

## 0.4.44

### Patch Changes

- Updated dependencies [8f0e48d]
  - @plutolang/graphviz-generator@0.4.11
  - @plutolang/base@0.4.9
  - @plutolang/pulumi-adapter@0.4.13
  - @plutolang/simulator-adapter@0.3.30
  - @plutolang/pyright-deducer@0.1.28
  - @plutolang/static-deducer@0.4.12
  - @plutolang/static-generator@0.4.9

## 0.4.43

### Patch Changes

- 714a952: feat(cli): support pluto.yml at project root with higher priority

  pluto.yml at the project root is now prioritized over .pluto directory configuration.

- Updated dependencies [c8dfa7a]
  - @plutolang/base@0.4.8
  - @plutolang/pulumi-adapter@0.4.12
  - @plutolang/simulator-adapter@0.3.29
  - @plutolang/pyright-deducer@0.1.27
  - @plutolang/static-deducer@0.4.11
  - @plutolang/graphviz-generator@0.4.10
  - @plutolang/static-generator@0.4.8

## 0.4.42

### Patch Changes

- b277a26: feat(deducer): add support for custom runtime adapter

  Add functionality to handle a custom adapter in the stack configuration.

  When the 'provision type' option is set to 'Custom', users are now prompted to enter the name of their adapter package. Once supplied, it is included in the project's configuration, enabling the use of a bespoke adapter.

- Updated dependencies [b277a26]
  - @plutolang/pyright-deducer@0.1.26
  - @plutolang/simulator-adapter@0.3.28
  - @plutolang/base@0.4.7
  - @plutolang/pulumi-adapter@0.4.11
  - @plutolang/static-deducer@0.4.10
  - @plutolang/graphviz-generator@0.4.9
  - @plutolang/static-generator@0.4.7

## 0.4.41

### Patch Changes

- Updated dependencies [3dc4015]
  - @plutolang/pyright-deducer@0.1.25

## 0.4.40

### Patch Changes

- Updated dependencies [4e5b0b1]
  - @plutolang/base@0.4.6
  - @plutolang/pulumi-adapter@0.4.10
  - @plutolang/simulator-adapter@0.3.27
  - @plutolang/pyright-deducer@0.1.24
  - @plutolang/static-deducer@0.4.9
  - @plutolang/graphviz-generator@0.4.8
  - @plutolang/static-generator@0.4.6

## 0.4.39

### Patch Changes

- 885864f: feat(cli): add split command
- Updated dependencies [2afed38]
  - @plutolang/pyright-deducer@0.1.23

## 0.4.38

### Patch Changes

- Updated dependencies [5f58b7c]
  - @plutolang/pyright-deducer@0.1.22

## 0.4.37

### Patch Changes

- Updated dependencies [a11206f]
  - @plutolang/pyright-deducer@0.1.21
  - @plutolang/simulator-adapter@0.3.26

## 0.4.36

### Patch Changes

- Updated dependencies [83f5d44]
  - @plutolang/pyright-deducer@0.1.20

## 0.4.35

### Patch Changes

- Updated dependencies [96c6609]
  - @plutolang/simulator-adapter@0.3.25

## 0.4.34

### Patch Changes

- Updated dependencies [88562a9]
  - @plutolang/pyright-deducer@0.1.19

## 0.4.33

### Patch Changes

- Updated dependencies [b7c9d45]
  - @plutolang/pyright-deducer@0.1.18

## 0.4.32

### Patch Changes

- 6f75db8: refactor(base): refactor architecture reference data structure

  Refine the argument type for adding resources to capture property types, clarifying usage. Redefine the three Relationship types for improved code readability and to clarify resource relationships across various scenarios.

- Updated dependencies [2afaee6]
- Updated dependencies [6f75db8]
- Updated dependencies [70f0e77]
- Updated dependencies [339dcfb]
- Updated dependencies [26757ce]
  - @plutolang/pyright-deducer@0.1.17
  - @plutolang/graphviz-generator@0.4.7
  - @plutolang/simulator-adapter@0.3.24
  - @plutolang/static-generator@0.4.5
  - @plutolang/static-deducer@0.4.8
  - @plutolang/base@0.4.5
  - @plutolang/pulumi-adapter@0.4.9

## 0.4.31

### Patch Changes

- Updated dependencies [ebc2191]
  - @plutolang/pulumi-adapter@0.4.8

## 0.4.30

### Patch Changes

- Updated dependencies [434e3fe]
  - @plutolang/pyright-deducer@0.1.16

## 0.4.29

### Patch Changes

- @plutolang/simulator-adapter@0.3.23

## 0.4.28

### Patch Changes

- d6a6d9e: feat(cli): introduce `run` command

  This commit adds the `run` command to the Pluto CLI. The `pluto run` command is designed to execute the Pluto app within the simulator.

- Updated dependencies [adc87b9]
  - @plutolang/simulator-adapter@0.3.22

## 0.4.27

### Patch Changes

- 8803264: fix(ci): prevent modification of dotfiles during release

  The dotfiles necessary for creating new Pluto app projects are stored without the leading dot and are modified when the CLI package is installed.

  Due to the repository being a monorepo managed by pnpm, executing `pnpm install` triggers the postinstall script, altering the dotfiles. Consequently, the released package fails to include the dotfiles.

  This commit resolves the issue by bypassing the postinstall script during CI package installation when the `RELEASE` environment variable is present.

## 0.4.26

### Patch Changes

- 6dbf274: fix(cli): fix that lost dotfiles in published package

  The npm pack command excludes dotfiles by default. This commit introduces a postinstall script to rename .gitignore to gitignore, applying the same renaming strategy to other dotfiles.

## 0.4.25

### Patch Changes

- 7cfe152: feat(cli): add `logs` command
- Updated dependencies [7cfe152]
  - @plutolang/pulumi-adapter@0.4.7
  - @plutolang/simulator-adapter@0.3.21

## 0.4.24

### Patch Changes

- Updated dependencies [c014d1c]
  - @plutolang/pyright-deducer@0.1.15
  - @plutolang/simulator-adapter@0.3.20
  - @plutolang/static-deducer@0.4.7

## 0.4.23

### Patch Changes

- Updated dependencies [4a0d854]
  - @plutolang/pyright-deducer@0.1.14

## 0.4.22

### Patch Changes

- @plutolang/simulator-adapter@0.3.19
- @plutolang/static-deducer@0.4.7

## 0.4.21

### Patch Changes

- Updated dependencies [7f2e28c]
  - @plutolang/pyright-deducer@0.1.13

## 0.4.20

### Patch Changes

- b0a3b1a: feat(cli): add .env file support for environment variables

  CLI commands now support loading environment variables from .env files. This feature simplifies configuring different environments without needing to change the codebase.

  Pluto CLI will load the `.env` files in a specific order. Test environment files are loaded only with the `test` command. And the local environment files are usually ignored by git:

  1. `.env` - The default file.
  2. `.env.local` - Local overrides, loaded in all environments for local development.
  3. `.env.test` - Overrides for the test environment.
  4. `.env.test.local` - Local overrides for the test environment.
  5. `.env.${stack}` - Environment-specific overrides, loaded for the specified stack, like `.env.aws` for the stack named `aws`.
  6. `.env.${stack}.local` - Local overrides for a specific stack.
  7. `.env.${stack}.test` - Test environment overrides for a specific stack.
  8. `.env.${stack}.test.local` - Local test environment overrides for a specific stack.

- Updated dependencies [5dd7c89]
- Updated dependencies [5930c52]
- Updated dependencies [87f35b5]
- Updated dependencies [1e8f254]
  - @plutolang/pyright-deducer@0.1.12
  - @plutolang/graphviz-generator@0.4.6
  - @plutolang/static-generator@0.4.4
  - @plutolang/base@0.4.4
  - @plutolang/pulumi-adapter@0.4.6
  - @plutolang/simulator-adapter@0.3.18
  - @plutolang/static-deducer@0.4.7

## 0.4.19

### Patch Changes

- Updated dependencies [3efe230]
  - @plutolang/graphviz-generator@0.4.5

## 0.4.18

### Patch Changes

- Updated dependencies [c406bdf]
- Updated dependencies [b3400ad]
  - @plutolang/pulumi-adapter@0.4.5
  - @plutolang/pyright-deducer@0.1.11
  - @plutolang/static-deducer@0.4.6
  - @plutolang/simulator-adapter@0.3.17

## 0.4.17

### Patch Changes

- @plutolang/simulator-adapter@0.3.16
- @plutolang/static-deducer@0.4.5

## 0.4.16

### Patch Changes

- c128904: feat(cli): enable graceful exit
- Updated dependencies [4cfb9a8]
- Updated dependencies [e9a1551]
- Updated dependencies [8db533e]
- Updated dependencies [58e6359]
  - @plutolang/static-deducer@0.4.5
  - @plutolang/pyright-deducer@0.1.10
  - @plutolang/simulator-adapter@0.3.15

## 0.4.15

### Patch Changes

- 8716509: feat(cli): enable --force option for destroy command

## 0.4.14

### Patch Changes

- Updated dependencies [023e0e2]
  - @plutolang/pyright-deducer@0.1.9
  - @plutolang/simulator-adapter@0.3.14

## 0.4.13

### Patch Changes

- Updated dependencies [bc6b168]
- Updated dependencies [a232931]
- Updated dependencies [0a01098]
  - @plutolang/pyright-deducer@0.1.8
  - @plutolang/base@0.4.3
  - @plutolang/simulator-adapter@0.3.13
  - @plutolang/static-deducer@0.4.4
  - @plutolang/pulumi-adapter@0.4.4
  - @plutolang/graphviz-generator@0.4.4
  - @plutolang/static-generator@0.4.3

## 0.4.12

### Patch Changes

- @plutolang/simulator-adapter@0.3.12

## 0.4.11

### Patch Changes

- Updated dependencies [aa14b9c]
  - @plutolang/pulumi-adapter@0.4.3
  - @plutolang/simulator-adapter@0.3.11

## 0.4.10

### Patch Changes

- Updated dependencies [4d74eb6]
  - @plutolang/pyright-deducer@0.1.7

## 0.4.9

### Patch Changes

- Updated dependencies [bfded23]
  - @plutolang/pyright-deducer@0.1.6
  - @plutolang/simulator-adapter@0.3.10

## 0.4.8

### Patch Changes

- 7926d75: feat(cli): add 'init' subcommand

  Users can now initialize a existing directory as a Pluto project by running `pluto init`.

## 0.4.7

### Patch Changes

- @plutolang/simulator-adapter@0.3.9

## 0.4.6

### Patch Changes

- Updated dependencies [f77412f]
  - @plutolang/pyright-deducer@0.1.5

## 0.4.5

### Patch Changes

- Updated dependencies [f4b7b8e]
- Updated dependencies [f351c5f]
  - @plutolang/pyright-deducer@0.1.4
  - @plutolang/graphviz-generator@0.4.3
  - @plutolang/simulator-adapter@0.3.8
  - @plutolang/static-deducer@0.4.3

## 0.4.4

### Patch Changes

- Updated dependencies [8819258]
  - @plutolang/static-generator@0.4.2
  - @plutolang/base@0.4.2
  - @plutolang/pulumi-adapter@0.4.2
  - @plutolang/simulator-adapter@0.3.7
  - @plutolang/pyright-deducer@0.1.3
  - @plutolang/static-deducer@0.4.3
  - @plutolang/graphviz-generator@0.4.2

## 0.4.3

### Patch Changes

- 5f3abe1: fix(deducer): failed to bundle the dependencies of pyright-internal when publishing pyright-deducer

  Before, we used the `bundleDependencies` option to bundle the dependencies of `pyright-internal` when publishing `pyright-deducer`. However, it failed to include the dependencies of `pyright-internal` when publishing `pyright-deducer`. So, we opted to utilize webpack to bundle the entire `pyright-deducer` package along with all its dependencies, including `pyright-internal` and its dependencies.

  Because webpack bundles each dependency of `pyright-deducer` into a single file, if we attempt to verify whether an instance of PyrightDeducer from `pyright-deducer` is an instance of Deducer from `@plutolang/base`, we will receive a false result. Therefore, we should check for the existence of the `deduce` method instead.

- Updated dependencies [5f3abe1]
  - @plutolang/pyright-deducer@0.1.2

## 0.4.2

### Patch Changes

- Updated dependencies [1ca8e3c]
- Updated dependencies [2a0a874]
  - @plutolang/pyright-deducer@0.1.1
  - @plutolang/base@0.4.1
  - @plutolang/pulumi-adapter@0.4.1
  - @plutolang/simulator-adapter@0.3.6
  - @plutolang/static-deducer@0.4.2
  - @plutolang/graphviz-generator@0.4.1
  - @plutolang/static-generator@0.4.1

## 0.4.1

### Patch Changes

- Updated dependencies [daa6ef9]
  - @plutolang/static-deducer@0.4.1
  - @plutolang/simulator-adapter@0.3.5

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
  - @plutolang/pyright-deducer@0.1.0
  - @plutolang/graphviz-generator@0.4.0
  - @plutolang/static-generator@0.4.0
  - @plutolang/pulumi-adapter@0.4.0
  - @plutolang/static-deducer@0.4.0
  - @plutolang/base@0.4.0
  - @plutolang/simulator-adapter@0.3.4

## 0.3.3

### Patch Changes

- d285a49: Feature: refactor Pluto's output management

  Refactor Pluto's output management by introducing a dedicated directory for the adapter to maintain its state. Migrate all state-related configurations, including lastArchRefFile, from the existing configuration file to this new state directory.

- Updated dependencies [d285a49]
  - @plutolang/simulator-adapter@0.3.3
  - @plutolang/pulumi-adapter@0.3.1
  - @plutolang/base@0.3.1
  - @plutolang/static-deducer@0.3.1
  - @plutolang/graphviz-generator@0.3.1
  - @plutolang/static-generator@0.3.1

## 0.3.2

### Patch Changes

- @plutolang/simulator-adapter@0.3.2
- @plutolang/static-deducer@0.3.0

## 0.3.1

### Patch Changes

- @plutolang/simulator-adapter@0.3.1
- @plutolang/static-deducer@0.3.0

## 0.3.0

### Minor Changes

- cc4fd80: feat: closure mode support, architecture reference structure enhancements, user custom function resource support

  - Closure Mode Support: Comprehensive modifications have been made to add support for closure mode. These include updates to the SDK for various cloud platforms, enhancing the deducer's closure analysis capabilities, incorporating closure import statements in the generated IaC code, and more.
  - Architectural Reference Structure Enhancements: The architectural reference structure now includes closure items. The CLI, generator, and deducer have been adjusted to align with the updated architectural reference structure.
  - User Custom Function Resource: Support has been added for user custom function resources on Alicloud, AWS, and Kubernetes.
  - Documentation Updates: The documentation has been revised to reflect these changes.

### Patch Changes

- Updated dependencies [cc4fd80]
  - @plutolang/graphviz-generator@0.3.0
  - @plutolang/simulator-adapter@0.3.0
  - @plutolang/static-generator@0.3.0
  - @plutolang/pulumi-adapter@0.3.0
  - @plutolang/static-deducer@0.3.0
  - @plutolang/base@0.3.0

## 0.2.11

### Patch Changes

- fe44c8e: chore(sdk): reformat the code to follow the norm
- Updated dependencies [fe44c8e]
  - @plutolang/simulator-adapter@0.2.10
  - @plutolang/pulumi-adapter@0.2.10
  - @plutolang/base@0.2.9
  - @plutolang/static-deducer@0.2.9
  - @plutolang/graphviz-generator@0.2.9
  - @plutolang/static-generator@0.2.9

## 0.2.10

### Patch Changes

- 62a0009: feat: instantiate resource infrastructure classes asynchronously within the base class of each resource
- Updated dependencies [62a0009]
  - @plutolang/simulator-adapter@0.2.9
  - @plutolang/static-generator@0.2.8
  - @plutolang/pulumi-adapter@0.2.9
  - @plutolang/base@0.2.8
  - @plutolang/static-deducer@0.2.8
  - @plutolang/graphviz-generator@0.2.8

## 0.2.9

### Patch Changes

- 5ae1dec: feat: support for transfering the values generated by compile-time to runtime

  Note: it hasn't supported for simulation testing yet, but it already can be used on the cloud platform.

- Updated dependencies [5ae1dec]
  - @plutolang/static-generator@0.2.7
  - @plutolang/static-deducer@0.2.7
  - @plutolang/base@0.2.7
  - @plutolang/simulator-adapter@0.2.8
  - @plutolang/pulumi-adapter@0.2.8
  - @plutolang/graphviz-generator@0.2.7

## 0.2.8

### Patch Changes

- 1352464: feat(cli): add version checker

## 0.2.7

### Patch Changes

- bf60683: enhance(adapter): split the adapter package
- Updated dependencies [bf60683]
  - @plutolang/simulator-adapter@0.2.7
  - @plutolang/pulumi-adapter@0.2.7
  - @plutolang/static-deducer@0.2.6
  - @plutolang/base@0.2.6
  - @plutolang/graphviz-generator@0.2.6
  - @plutolang/static-generator@0.2.6

## 0.2.6

### Patch Changes

- 0d8fc6f: fix: the directory does not exist when generating initial files
  fix: cannot destroy before successfully deploying
  fix: the configuration file format does not adapt the latest version
- Updated dependencies [0d8fc6f]
  - @plutolang/base@0.2.5
  - @plutolang/adapters@0.2.6
  - @plutolang/static-deducer@0.2.5
  - @plutolang/graphviz-generator@0.2.5
  - @plutolang/static-generator@0.2.5

## 0.2.5

### Patch Changes

- 5736dc1: enhance: refactor the component apis
- 38eef8e: enhance: normalize the configuration models, including project and stack.
- Updated dependencies [5736dc1]
- Updated dependencies [38eef8e]
  - @plutolang/graphviz-generator@0.2.4
  - @plutolang/static-generator@0.2.4
  - @plutolang/static-deducer@0.2.4
  - @plutolang/adapters@0.2.5
  - @plutolang/base@0.2.4

## 0.2.4

### Patch Changes

- 3401159: feat: support simulation test
- Updated dependencies [3401159]
  - @plutolang/adapters@0.2.4
  - @plutolang/base@0.2.3
  - @plutolang/static-deducer@0.2.3
  - @plutolang/graphviz-generator@0.2.3
  - @plutolang/static-generator@0.2.3

## 0.2.3

### Patch Changes

- c2bcfb6: feat(cli): impl test command, support testing on AWS
- Updated dependencies [c2bcfb6]
  - @plutolang/static-generator@0.2.2
  - @plutolang/adapters@0.2.3
  - @plutolang/base@0.2.2
  - @plutolang/static-deducer@0.2.2
  - @plutolang/graphviz-generator@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [cf2a147]
  - @plutolang/adapters@0.2.2

## 0.2.1

### Patch Changes

- a5539e6: feat: support for AliCloud's ApiGateway and FC
- Updated dependencies [a5539e6]
  - @plutolang/adapters@0.2.1
  - @plutolang/base@0.2.1
  - @plutolang/static-deducer@0.2.1
  - @plutolang/graphviz-generator@0.2.1
  - @plutolang/static-generator@0.2.1

## 0.2.0

### Minor Changes

- 505de47: https://github.com/pluto-lang/pluto/releases/tag/v0.2.0

### Patch Changes

- Updated dependencies [505de47]
  - @plutolang/adapters@0.2.0
  - @plutolang/static-deducer@0.2.0
  - @plutolang/graphviz-generator@0.2.0
  - @plutolang/static-generator@0.2.0
  - @plutolang/base@0.2.0

## 0.1.3

### Patch Changes

- Updated dependencies [6f2d1d5]
  - @plutolang/static-deducer@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [de25ad5]
  - @plutolang/static-generator@0.1.1
  - @plutolang/static-deducer@0.1.2
  - @plutolang/base@0.1.1
  - @plutolang/adapters@0.1.1
  - @plutolang/graphviz-generator@0.1.1

## 0.1.1

### Patch Changes

- Updated dependencies [e587e81]
  - @plutolang/static-deducer@0.1.1

## 0.1.0

### Minor Changes

- 055b3c7: Release 0.1.0

### Patch Changes

- Updated dependencies [055b3c7]
- Updated dependencies [1356132]
  - @plutolang/adapters@0.1.0
  - @plutolang/static-deducer@0.1.0
  - @plutolang/graphviz-generator@0.1.0
  - @plutolang/static-generator@0.1.0
  - @plutolang/base@0.1.0

## 0.0.9

### Patch Changes

- 4c28ce8: Add 'yes' option to the deploy command.

## 0.0.8

### Patch Changes

- Updated dependencies [4247f22]
  - @plutolang/adapters@0.0.3

## 0.0.7

### Patch Changes

- 807854a: Add some tips on current functionality.

## 0.0.6

### Patch Changes

- Updated dependencies [fac0e1e]
  - @plutolang/static-deducer@0.0.5

## 0.0.5

### Patch Changes

- Updated dependencies [77ec0ba]
  - @plutolang/static-deducer@0.0.4

## 0.0.4

### Patch Changes

- c504f5b: Support schedule resource on AWS and K8s.
- Updated dependencies [c504f5b]
  - @plutolang/static-generator@0.0.3
  - @plutolang/static-deducer@0.0.3

## 0.0.3

### Patch Changes

- rename @pluto to @plutolang
- Updated dependencies
  - @plutolang/graphviz-generator@0.0.2
  - @plutolang/static-generator@0.0.2
  - @plutolang/static-deducer@0.0.2
  - @plutolang/adapters@0.0.2
  - @plutolang/base@0.0.2

## 0.0.2

### Patch Changes

- first release
- Updated dependencies
  - @pluto/graphviz-generator@0.0.1
  - @pluto/static-generator@0.0.1
  - @pluto/static-deducer@0.0.1
  - @pluto/adapters@0.0.1
  - @pluto/base@0.0.1
