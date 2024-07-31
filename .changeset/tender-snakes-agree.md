---
"@plutolang/cli": patch
---

feat(cli): add --live flag to pluto run for live reloading

The --live flag has been introduced to the 'pluto run' command to enable live reloading.

When this flag is active, it monitors file changes in the directory containing the entrypoint and automatically re-executes the project if any modifications are detected.
