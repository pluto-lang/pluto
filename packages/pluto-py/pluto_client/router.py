from dataclasses import dataclass
from typing import Callable, Dict, Optional
from pluto_base.platform import PlatformType
from pluto_base import utils, resource


@dataclass
class HttpRequest:
    path: str
    method: str
    headers: Dict[str, str]
    query: Dict[str, str | list[str]]
    body: Optional[str]


@dataclass
class HttpResponse:
    status_code: int
    body: str


RequestHandler = Callable[[HttpRequest], HttpResponse]


@dataclass
class RouterOptions:
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

    def all(self, path: str, fn: Callable, raw: bool = False):
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
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(name: str, opts: Optional[RouterOptions] = None) -> IRouterClient:
        platform_type = utils.current_platform_type()
        if platform_type in [PlatformType.AWS, PlatformType.K8s, PlatformType.AliCloud]:
            from .clients import shared

            return shared.RouterClient(name, opts)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
