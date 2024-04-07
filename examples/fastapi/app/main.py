from mangum import Mangum
from fastapi import FastAPI
from pluto_client import Router


# FastAPI application have to be returned from a function, and the routes should be defined inside
# the function. This is because Pluto will find the dependencies of the infrastructure method call
# `router.all`, and encapsulate all the dependencies into a single code bundle. If the FastAPI
# application is defined outside the function, Pluto will only find the application object, and the
# routes will be missed. So, the routes will not be included in the final code bundle. This is a
# limitation of the current Pluto implementation.
def return_app():
    app = FastAPI()

    @app.get("/hello")
    def hello():
        return "Hello, Pluto!"

    return app


# `api_gateway_base_path` is the default stage name for the API Gateway, typically set to `/dev`
# when deployed via Pluto.
handler = Mangum(return_app(), api_gateway_base_path="/dev")


def raw_handler(*args, **kwargs):
    return handler(*args, **kwargs)


router = Router("router")
router.all("/*", raw_handler, raw=True)
