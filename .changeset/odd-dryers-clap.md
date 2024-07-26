---
"@plutolang/simulator-adapter": patch
---

feat(simulator): set default port and enable direct client API invocation

Set simulator's default port to 9001 to standardize the starting point.

Enable invocation of client APIs through simulator API formatted as `http://<simulator_url>/<resource_id>/<method>`. This allows users to test client APIs directly using curl, simplifying the testing process.
