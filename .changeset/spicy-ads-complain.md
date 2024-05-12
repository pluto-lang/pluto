---
"@plutolang/pyright-deducer": patch
"@plutolang/static-deducer": patch
---

feat(deducer): allow using direct captured properties as arguments in infra API

This change introduces the ability to use direct captured properties as arguments in infrastructure API calls. For instance, the code below is now considered valid:

```python
from pluto_client import Website, Router

router = Router("router")
website = Website(path="path/to/website", name="website")

website.addEnv("ROUTER", router.url())
```

In this example, `router.url()` is a direct captured property which the website utilizes to establish a connection to the backend service.

The goal is for the infrastructure API to accept both direct captured properties and variables assigned with these properties, as demonstrated here:

```python
from pluto_client import Website, Router

router = Router("router")
website = Website(path="path/to/website", name="website")

router_url = router.url()
website.addEnv("ROUTER", router_url)
```

Currently, the API only accepts direct captured properties as arguments. Future updates will include support for variables that store the return values of these properties.
