from dataclasses import dataclass
from typing import Optional
from pluto_base.resource import (
    IResource,
    IResourceCapturedProps,
    IResourceClientApi,
    IResourceInfraApi,
)
from pluto_base.platform import PlatformType
from pluto_base import utils
from .utils import create_simulator_client


@dataclass
class KVStoreOptions:
    pass


class IKVStoreRegularApi:
    @property
    def aws_table_name(self) -> str:
        raise NotImplementedError

    @property
    def aws_partition_key(self) -> str:
        raise NotImplementedError


class IKVStoreClientApi(IResourceClientApi):
    def get(self, key: str) -> str:
        raise NotImplementedError

    def set(self, key: str, val: str) -> None:
        raise NotImplementedError


class IKVStoreInfraApi(IResourceInfraApi):
    pass


class IKVStoreCapturedProps(IResourceCapturedProps):
    pass


class IKVStoreClient(IKVStoreClientApi, IKVStoreCapturedProps, IKVStoreRegularApi):
    pass


class IKVStoreInfra(IKVStoreInfraApi, IKVStoreCapturedProps):
    pass


class KVStore(IResource, IKVStoreClient, IKVStoreInfra):
    fqn = "@plutolang/pluto.KVStore"

    def __init__(self, name: str, opts: Optional[KVStoreOptions] = None):
        platform_type = utils.current_platform_type()
        if platform_type == PlatformType.AWS:
            from .clients import aws

            self._client = aws.DynamoKVStore(name, opts)

        elif platform_type == PlatformType.Simulator:
            resource_id = utils.gen_resource_id(KVStore.fqn, name)
            self._client = create_simulator_client(resource_id)  # type: ignore

        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
