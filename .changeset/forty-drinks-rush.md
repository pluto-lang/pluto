---
"@plutolang/static-generator": patch
---

feat(generator): support resource type definition in subdirectories

Previously, resource types could only be defined in the root directory. This commit enables defining the resource type within subdirectories.

SDK developers can now specify the fully qualified name (FQN) of a resource type in the format `<package_name>.<directory_name>.<class_name>`. In the infrastructure SDK, define the resource type as `<directory_name>.<class_name>`.
