---
"@plutolang/base": patch
---

fix(base): prevent duplicate relationships in arch ref

Previously, adding a relationship to the arch ref object didn't check for existing identical relationships, leading to duplicates. Now, it verifies if the same relationship already exists in the object and prevents adding it again if found.
