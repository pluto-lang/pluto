from dataclasses import dataclass
from typing import Any, Callable, Dict, Generic, Optional, TypeVar
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceInfraApi,
    IResourceClientApi,
)
from pluto_base.platform import PlatformType
from pluto_base import utils


DEFAULT_FUNCTION_NAME = "default"

FnHandler = TypeVar("FnHandler", bound=Callable[..., Any])


@dataclass
class DirectCallResponse:
    code: int
    body: Any


@dataclass
class FunctionOptions:
    name: str | None = None
    envs: Dict[str, Any] | None = None


class IFunctionClientApi(Generic[FnHandler], IResourceClientApi):
    def invoke(self, *args, **kwargs) -> Any:
        raise NotImplementedError


class IFunctionInfraApi(IResourceInfraApi):
    pass


class IFunctionCapturedProps(IResourceCapturedProps):
    def url(self) -> str:
        raise NotImplementedError


class IFunctionClient(IFunctionClientApi[FnHandler], IFunctionCapturedProps):
    pass


class IFunctionInfra(IFunctionInfraApi, IFunctionCapturedProps):
    pass


class Function(IResource, IFunctionClient[FnHandler], IFunctionInfra):
    fqn = "@plutolang/pluto.Function"

    def __init__(self, func: FnHandler, opts: Optional[FunctionOptions] = None):
        raise NotImplementedError(
            "Cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(
        func: FnHandler, opts: Optional[FunctionOptions] = None
    ) -> IFunctionClient[FnHandler]:
        platform_type = utils.current_platform_type()
        if platform_type == PlatformType.AWS:
            from .clients import aws

            return aws.LambdaFunction(func, opts)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
