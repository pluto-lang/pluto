from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)
from pluto_base.platform import PlatformType
from pluto_base import utils


class ISecretClientApi(IResourceClientApi):
    def get(self) -> str:
        """Get the secret value."""
        raise NotImplementedError


class ISecretInfraApi(IResourceInfraApi):
    pass


class ISecretCapturedProps(IResourceCapturedProps):
    pass


class ISecretClient(ISecretClientApi, ISecretCapturedProps):
    pass


class ISecretInfra(ISecretInfraApi, ISecretCapturedProps):
    pass


class Secret(IResource, ISecretClient, ISecretInfra):
    fqn = "@plutolang/pluto.Secret"

    def __init__(self, name: str, value: str):
        platform_type = utils.current_platform_type()
        if platform_type == PlatformType.AWS:
            from .clients import aws

            self._client = aws.Secret(name, value)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
