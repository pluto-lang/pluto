# About this Guide

This guide is intended to help document how `pluto` works, and to help new contributors get involved in the pluto development.

This guide consists of **4** parts:

1. **Building and Testing `pluto`**: Contains information that should be useful no matter how you are contributing, about building, testing, debugging, profiling, etc.
2. **Contributing to `pluto`**: Contains information that should be useful no matter how you are contributing, about procedures for contribution, using git and Github, etc.
3. **`pluto` Architecture**: Contains an introduction to the architecture of the compiler and a detailed introduction to each compilation process.
4. **Appendices**: There are a few of these with different information, including a glossary.

The Guide itself is of course open-source as well, and the sources can be found at the [GitHub repository](https://github.com/pluto-lang/pluto/tree/main/docs/dev_guide). If you find any mistakes in the guide, please file an issue about it. Even better, open a Github Pull Request (PR) with a correction!

If you do contribute to the guide, please see the corresponding subsection on writing documentation in this guide.

## Quick Start

This documentation is _NOT_ intended to be comprehensive; it is meant to be a quick guide for the most useful things. For more information, see the develop guide in its entirety.

## Asking Questions

Before asking a question, make sure you have:

- Searched open and closed:
  - [Pluto GitHub Issues](https://github.com/pluto-lang/pluto/issues)
- Read the documentations:
  - [Pluto Readme](https://github.com/pluto-lang/pluto)

If you have any questions about `pluto`, you are welcome to ask your questions in [Github Issues](https://github.com/pluto-lang/pluto/issues). When you ask a question, please describe the details as clearly as possible so that others in the Pluto community can understand, and you _MUST_ be polite and avoid personal attack and avoid not objective comparison with other projects.

## Cloning and Building `pluto`

### System Requirements

The following hardware is recommended.

- 10GB+ of free disk space.
- 4GB+ RAM
- 2+ cores

### Dependencies

#### pnpm

See [here](https://pnpm.io/installation) to install pnpm

#### Pulumi

See [here](https://www.pulumi.com/docs/install/) to install Pulumi

#### Optional: Kind

If you are interested in developing an Infrastructure Software Development Kit (SDK) for Kubernetes, a useful tool to consider is [kind](https://kind.sigs.k8s.io/). You can follow the [installation guide](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) for instructions on how to install it. Additionally, you can refer to the documentation on configuring the environment for Pluto by following [this link](./setup-k8s-dev-env.en.md). This will create a local cluster using Docker named pluto. On the Docker dashboard, you will be able to see a container named pluto-control-plane.

### Cloning

You can just do a normal git clone:

```sh
git clone https://github.com/pluto-lang/pluto.git
cd pluto
```

### Building

In the top level of the `pluto-lang/pluto` repo and run:

```sh
pnpm install && pnpm build
```

### Format

In the top level of the `pluto-lang/pluto` repo and run:

```sh
pnpm format
```

### Linting

In the top level of the `pluto-lang/pluto` repo and run:

```
pnpm lint
```

### Testing

In the top level of the `pluto-lang/pluto` repo and run:

```sh
pnpm test
```

## Contributor Procedures

### Create an Issue

Every change should be accompanied by a dedicated tracking issue for that change. The main text of this issue should describe the change being made, with a focus on what users must do to fix their code. The issue should be approachable and practical; it may make sense to direct users to some other issue for the full details. The issue also serves as a place where users can comment with questions or other concerns.

When you open an issue on the `pluto-lang/pluto` repo, you need to to choose an issue template on this [page](https://github.com/pluto-lang/pluto/issues/new/choose), you can choose a template according to different situations and fill in the corresponding content, and you also need to select appropriate labels for your issue to help classify and identify.

### Create a PR

When you open a PR on the `pluto-lang/pluto` repo, and reviewers are the persons that will approve the PR to be tested and merged.

Please note that all code changes in the Pluto project require corresponding comments and tests. For more code and test writing details, please see the chapters on code of conduct and testing.

Besides, all PRs need to have corresponding issues tracking, and need to add appropriate labels and milestone information.

Furthermore, this repository utilizes [changesets](https://github.com/changesets/changesets) to facilitate easier release updates. As a contributor, this means that when your changes are ready, you should run `npx changeset`. For more details, refer to this concise document on [adding a changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md#i-am-in-a-single-package-repository).

#### Bug Fixes or "Normal" Code Changes

For most PRs, no special procedures are needed. You can just open an issue and a PR, and it will be reviewed, approved, and merged. This includes most bug fixes, refactorings, and other user-invisible changes.

Also, note that it is perfectly acceptable to open WIP PRs or GitHub Draft PRs. Some people prefer to do this so they can get feedback along the way or share their code with a collaborator. Others do this so they can utilize the CI to build and test their PR (e.g. if you are developing on a laptop).

#### New Features

In order to implement a new feature, usually you will need to create a issue to propose a design, have discussions, etc. After a feature is approved to be added, a tracking issue is created on the `pluto-lang/pluto` repo, which tracks the progress towards the implementation of the feature, any bugs reported, and eventually stabilization. The feature then can be implemented.
