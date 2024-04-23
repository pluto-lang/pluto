from typing import Callable, Optional
from dataclasses import dataclass
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)


@dataclass
class ScheduleOptions:
    pass


ScheduleHandler = Callable[[], None]


class IScheduleClientApi(IResourceClientApi):
    pass


class IScheduleInfraApi(IResourceInfraApi):
    def cron(self, cron: str, fn: ScheduleHandler) -> None:
        """Create a cron job.

        Args:
            cron (str): Cron expressions have five required fields, which are separated by white
            space. Format: Minutes(0-59) Hours(0-23) Day-of-month(1-31) Month(1-12) Day-of-week(0-6)
        """
        raise NotImplementedError


class IScheduleCapturedProps(IResourceCapturedProps):
    pass


class IScheduleClient(IScheduleClientApi, IScheduleCapturedProps):
    pass


class IScheduleInfra(IScheduleInfraApi, IScheduleCapturedProps):
    pass


class Schedule(IResource, IScheduleClient, IScheduleInfra):
    fqn = "@plutolang/pluto.Schedule"

    def __init__(self, name: str, opts: Optional[ScheduleOptions] = None):
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )
