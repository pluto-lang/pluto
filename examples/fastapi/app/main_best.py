"""
The example demonstrates the best practice for deploying a FastAPI application with Pluto.

The process of adapting to FastAPI should be completed within the Pluto ecosystem SDK, where users
only need to call the `serverless_router` function.

There are several features that Pluto needs to support:
  1. Multiple file deduction. User code and SDK code reside in separate files.
  2. SDK deduction. SDK code exists outside of the user's project and requires automatic analysis
     during the deduction process.
  3. Non-global scope resource definition. Resource definitions and Infra APIs are not invoked in
     the global scope; instead, they are called within functions. We need to obtain the resource
     definition parameters based on control flow and data flow analysis.
"""

from fastapi import FastAPI

from pluto_ecosystem import serverless_router

app = FastAPI()


@app.get("/hello")
def hello():
    return "Hello, Pluto!"


serverless_router(app, name="router")


# Pluto Ecosystem SDK
from mangum import Mangum
from pluto_client import Router


def serverless_router(app: FastAPI, name: str, prefix: str = "/"):
    handler = Mangum(app)

    def raw_handler(*args, **kwargs):
        return handler(*args, **kwargs)

    router = Router(name)
    router.all(prefix, raw_handler)
