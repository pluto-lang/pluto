from dataclasses import dataclass
from typing import Any, Callable, Optional
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)
from pluto_base.platform import PlatformType
from pluto_base import utils


@dataclass
class CloudEvent:
    timestamp: float
    data: str


EventHandler = Callable[[CloudEvent], None]


@dataclass
class QueueOptions:
    pass


class IQueueClientApi(IResourceClientApi):
    # This method can't be abstract. If it were, the subclass, specifically the resource base class
    # 'Queue', would have to implement it. But, this subclass is abstract too, mainly offering
    # developers typing hints. By making it a regular method, there's no longer a need for
    # subclasses to implement it themselves.
    def push(self, msg: str) -> Any:
        raise NotImplementedError


class IQueueInfraApi(IResourceInfraApi):
    def subscribe(self, fn: EventHandler) -> None:
        raise NotImplementedError


class IQueueCapturedProps(IResourceCapturedProps):
    pass


class IQueueClient(IQueueClientApi, IQueueCapturedProps):
    pass


class IQueueInfra(IQueueInfraApi, IQueueCapturedProps):
    pass


class Queue(IResource, IQueueClient, IQueueInfra):
    fqn = "@plutolang/pluto.Queue"

    def __init__(self, name: str, opts: Optional[QueueOptions] = None):
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(name: str, opts: Optional[QueueOptions] = None) -> IQueueClient:
        platform_type = utils.current_platform_type()
        if platform_type == PlatformType.AWS:
            from .clients import aws

            return aws.SNSQueue(name, opts)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
