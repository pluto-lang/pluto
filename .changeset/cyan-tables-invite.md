---
"@plutolang/pulumi-adapter": patch
---

feat(adapter): add `projectRoot` to Pulumi config for path resolution

This commit adds the `projectRoot` setting to the Pulumi configuration by default. This feature improves the accuracy of relative path resolution for resource creation, like a Website. With the `projectRoot` available, the infra SDK can correctly resolve paths given by the user relative to the project's base directory. For instance, creating a Website resource with a path parameter relative to the project root is now possible as demonstrated:

```typescript
const website = new Website("./public");
```
