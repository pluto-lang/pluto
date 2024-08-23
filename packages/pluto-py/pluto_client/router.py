from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from pluto_base.platform import PlatformType
from pluto_base import utils, resource
from .utils import create_simulator_client


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
    cors: Optional[bool] = None
    """
    Currently, only support Vercel. If an invalid value is provided, or if no value is provided at
    all, it will default to your specified platform.
    """
    sim_host: Optional[str] = None
    """
    Host address for simulating the website when running the project with `pluto run`. If not
    provided, it will be `localhost`.
    """
    sim_port: Optional[str] = None
    """
    Port number for simulating the website when running the project with `pluto run`. If not
    provided, it will be randomly assigned.
    """


class IRouterClientApi(resource.IResourceClientApi):
    pass


class IRouterInfraApi(resource.IResourceInfraApi):
    def get(self, path: str, fn: RequestHandler) -> None:
        raise NotImplementedError

    def post(self, path: str, fn: RequestHandler) -> None:
        raise NotImplementedError

    def put(self, path: str, fn: RequestHandler) -> None:
        raise NotImplementedError

    def delete(self, path: str, fn: RequestHandler) -> None:
        raise NotImplementedError

    def all(self, path: str, fn: Callable[..., Any], raw: bool = False) -> None:
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
        platform_type = utils.current_platform_type()
        if platform_type in [PlatformType.AWS, PlatformType.K8s, PlatformType.AliCloud]:
            from .clients import shared

            self._client = shared.RouterClient(name, opts)

        elif platform_type == PlatformType.Simulator:
            resource_id = utils.gen_resource_id(Router.fqn, name)
            self._client = create_simulator_client(resource_id)  # type: ignore

        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
