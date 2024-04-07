---
"@plutolang/pluto-infra": patch
"@plutolang/pluto": patch
---

feat(sdk): add `all` route function to router class

Introduces a new method to the router class, enabling users to specify a route that matches all HTTP methods. Additionally, this function includes a 'raw' parameter, indicating that the route won't undergo parsing by the SDK. Instead, the raw HTTP request will be forwarded directly to the handler. This is beneficial for users who prefer to handle HTTP request routing independently.
