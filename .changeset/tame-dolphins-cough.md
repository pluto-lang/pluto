---
"@plutolang/pyright-deducer": patch
"@plutolang/static-generator": patch
"@plutolang/pluto-infra": patch
"@plutolang/base": patch
---

feat: enable runtime access to locally defined env vars

Previously, environment variables were only accessible through the resource constructor and infrastructure APIs. This commit enables client APIs to access these variables.

During function argument extraction by the deducer from the resource constructor or infrastructure APIs, all accessed environment variables within the compute closure are recorded. These variables are then passed to the architecture reference. Subsequently, the generator declares these environment variables for each closure variable in the IaC code. When the adapter runs the IaC code, it sets up the environment variables for the built function instance, such as AWS Lambda instances. The procedure of setting up these environment variables is written in the infrastructure SDK.
