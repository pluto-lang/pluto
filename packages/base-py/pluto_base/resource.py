from abc import ABC
from typing import Protocol


class IResourceClientApi(ABC):
    pass


class IResourceInfraApi(ABC):
    pass


class IResourceCapturedProps(ABC):
    pass


class _IResourceClient(Protocol, IResourceClientApi, IResourceCapturedProps):  # type: ignore
    pass


class IResource(ABC):
    fqn: str
    """
    Fully qualified name of the resource type. It should be same between the client and the infra
    sdk.
    """
    _client: _IResourceClient
    """
    The client implemention of the resource for the specific cloud provider.
    """

    def __getattribute__(self, name: str):
        if name == "fqn":
            return super().__getattribute__(name)

        # Try to get the attribute from the client, if it doesn't exist, return the attribute of
        # self. This is to make sure that the client is the first priority.
        try:
            client = super().__getattribute__("_client")
            return getattr(client, name)
        except:
            # If the _client doesn't exist, or the attribute doesn't exist in the client, return the
            # attribute of self.
            return super().__getattribute__(name)
