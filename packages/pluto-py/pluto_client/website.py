from typing import  Optional
from dataclasses import dataclass
from pluto_base import utils
from pluto_base.platform import PlatformType
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)

from .utils import create_simulator_client


@dataclass
class WebsiteOptions:
    platform: Optional[str] = None
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


class IWebsiteClientApi(IResourceClientApi):
    pass


class IWebsiteInfraApi(IResourceInfraApi):
    def addEnv(self, key: str, value: str) -> None:
        raise NotImplementedError


class IWebsiteCapturedProps(IResourceCapturedProps):
    def url(self) -> str:
        raise NotImplementedError


class IWebsiteClient(IWebsiteClientApi, IWebsiteCapturedProps):
    pass


class IWebsiteInfra(IWebsiteInfraApi, IWebsiteCapturedProps):
    pass


class Website(IResource, IWebsiteClient, IWebsiteInfra):
    fqn = "@plutolang/pluto.Website"

    def __init__(
        self,
        path: str,
        name: Optional[str] = None,
        opts: Optional[WebsiteOptions] = None,
    ):
        platform_type = utils.current_platform_type()
        if platform_type in [PlatformType.AWS]:
            from .clients import shared

            self._client = shared.WebsiteClient(path, name, opts)
        if platform_type == PlatformType.Simulator:
            resource_id = utils.gen_resource_id(Website.fqn, name or "default")
            self._client = create_simulator_client(resource_id)  # type: ignore
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
