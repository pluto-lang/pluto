---
"@plutolang/pulumi-adapter": patch
---

feat(adapter): automate Pulumi installation during adapter operation

In this commit, we've added an automatic Pulumi installation step to the adapter operation. This ensures that if Pulumi is either not installed or not in the specified version or path, the adapter will automatically handle its installation.
