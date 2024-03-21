---
"@plutolang/pyright-deducer": minor
"@plutolang/graphviz-generator": minor
"@plutolang/static-generator": minor
"@plutolang/pulumi-adapter": minor
"@plutolang/static-deducer": minor
"@plutolang/pluto-infra": minor
"@plutolang/pluto": minor
"@plutolang/base": minor
"@plutolang/cli": minor
---

feat: python support, validated with quickstart

We created a deducer using Pyright. It can automatically analyze the dependent packages for each section of business logic, and the adapter includes them in the zip archive for publishing on AWS Lambda.

Currently, Pluto supports simple Python projects. Users can use the pluto command to create and deploy Python projects. However, if the project relies on packages with different distribution packages on various platforms, or if the archive size after zipping exceeds the AWS limit of 50 MB, it will fail.

For more details, you can find in the PRs related to the issue https://github.com/pluto-lang/pluto/issues/146 .
