from pydantic import BaseModel
from typing import Callable, Dict, Optional, Union
from pluto_base.platform import PlatformType
from pluto_base import utils, resource
from .clients import shared


class HttpRequest:
    def __init__(self, path: str, method: str, headers: Dict[str, Optional[str]],
                 query: Dict[str, Optional[Union[str, list]]], body: Optional[str]):
        self.path = path
        self.method = method
        self.headers = headers
        self.query = query
        self.body = body


class HttpResponse:
    def __init__(self, status_code: int, body: str):
        self.status_code = status_code
        self.body = body


RequestHandler = Callable[[HttpRequest], HttpResponse]


class RouterOptions(BaseModel):
    pass


class IRouterClientApi(resource.IResourceClientApi):
    pass


class IRouterInfraApi(resource.IResourceInfraApi):
    def get(self, path: str, fn: RequestHandler):
        raise NotImplementedError

    def post(self, path: str, fn: RequestHandler):
        raise NotImplementedError

    def put(self, path: str, fn: RequestHandler):
        raise NotImplementedError

    def delete(self, path: str, fn: RequestHandler):
        raise NotImplementedError


class IRouterCapturedProps(resource.IResourceCapturedProps):
    def url(self) -> str:
        raise NotImplementedError


class IRouterClient(IRouterClientApi, IRouterCapturedProps):
    pass


class IRouterInfra(IRouterInfraApi, IRouterCapturedProps):
    pass


class Router(resource.IResource, IRouterClient, IRouterInfra):
    fqn = "@plutolang/pluto.Router"

    def __init__(self, name: str, opts: Optional[RouterOptions] = None):
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime.")

    @staticmethod
    def build_client(name: str, opts: Optional[RouterOptions] = None) -> IRouterClient:
        platform_type = utils.current_platform_type()
        if platform_type in [PlatformType.AWS, PlatformType.K8s, PlatformType.AliCloud]:
            return shared.RouterClient(name, opts)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
