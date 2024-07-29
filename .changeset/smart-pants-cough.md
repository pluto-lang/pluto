---
"@plutolang/pyright-deducer": patch
---

feat(deducer): parse index URLs from requirements.txt

The deducer now parses index URLs specified in the project's root requirements.txt file. These URLs are utilized for dependency installation and are also included in the generated requirements.txt file.
