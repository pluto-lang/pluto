from typing import Optional
from dataclasses import dataclass
from pluto_base import utils
from pluto_base.platform import PlatformType
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)


@dataclass
class WebsiteOptions:
    platform: Optional[str] = None
    """
    Currently, only support Vercel. If an invalid value is provided, or if no value is provided at
    all, it will default to your specified platform.
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
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(
        path: str,
        name: Optional[str] = None,
        opts: Optional[WebsiteOptions] = None,
    ) -> IWebsiteClient:
        platform_type = utils.current_platform_type()
        if platform_type in [PlatformType.AWS]:
            from .clients import shared

            return shared.WebsiteClient(path, name, opts)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
