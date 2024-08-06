---
"@plutolang/pluto": patch
---

feat(sdk): remove runtime dependency for AWS account ID retrieval

The previous AWS queue resource type implementation required the `AWS_ACCOUNT_ID` environment variable to be set by the runtime handler. The setting only occurred upon receiving a request, causing a panic if the queue resource type was used globally without the `AWS_ACCOUNT_ID` being set.

This commit eliminates the need for runtime setting of `AWS_ACCOUNT_ID` by utilizing the `sts.GetCallerIdentity` API to retrieve the account ID.
