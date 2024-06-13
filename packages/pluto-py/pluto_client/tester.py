from dataclasses import dataclass
from typing import Any, Callable, Optional, List
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)
from pluto_base.platform import PlatformType
from pluto_base import utils
from .utils import create_simulator_client


class TestCase:
    def __init__(self, description: str, test_handler: Any):
        self.description = description
        self.testHandler = test_handler


TestHandler = Callable[[], None]


@dataclass
class TesterOptions:
    pass


class ITesterClientApi(IResourceClientApi):
    def list_tests(self) -> List[TestCase]:
        raise NotImplementedError

    def run_test(self, test_case: TestCase) -> None:
        raise NotImplementedError


class ITesterInfraApi(IResourceInfraApi):
    def it(self, description: str, fn: TestHandler) -> None:
        raise NotImplementedError


class ITesterCapturedProps(IResourceCapturedProps):
    pass


class ITesterClient(ITesterClientApi, ITesterCapturedProps):
    pass


class ITesterInfra(ITesterInfraApi, ITesterCapturedProps):
    pass


class Tester(IResource, ITesterClient, ITesterInfra):
    fqn = "@plutolang/pluto.Tester"

    def __init__(self, name: str, opts: Optional[TesterOptions] = None):
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(name: str, opts: Optional[TesterOptions] = None) -> ITesterClient:
        platform_type = utils.current_platform_type()
        if platform_type == PlatformType.Simulator:
            resource_id = utils.gen_resource_id(Tester.fqn, name)
            return create_simulator_client(resource_id)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
