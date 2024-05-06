---
"@plutolang/pyright-deducer": patch
---

feat(deducer): dynamically obtain resource type FQN from class definition

Previously, the process of obtaining the fully qualified name (FQN) of a resource type was based on a hard-coded package name during deducing. This approach has been updated to leverage a `fqn` member variable present within the resource type class definition itself, thus avoiding the need for hard-coding.
