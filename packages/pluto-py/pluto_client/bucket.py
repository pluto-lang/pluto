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


@dataclass
class BucketOptions:
    pass


class IBucketRegularApi:
    @property
    def aws_table_name(self) -> str:
        raise NotImplementedError

    @property
    def aws_partition_key(self) -> str:
        raise NotImplementedError


class IBucketClientApi(IResourceClientApi):
    def put(self, file_key: str, file_path: str):
        raise NotImplementedError

    def get(self, file_key: str, file_path: str):
        raise NotImplementedError


class IBucketInfraApi(IResourceInfraApi):
    pass


class IBucketCapturedProps(IResourceCapturedProps):
    pass


class IBucketClient(IBucketClientApi, IBucketCapturedProps, IBucketRegularApi):
    pass


class IBucketInfra(IBucketInfraApi, IBucketCapturedProps):
    pass


class Bucket(IResource, IBucketClient, IBucketInfra):
    fqn = "@plutolang/pluto.Bucket"

    def __init__(self, name: str, opts: Optional[BucketOptions] = None):
        raise NotImplementedError(
            "cannot instantiate this class, instead of its subclass depending on the target runtime."
        )

    @staticmethod
    def build_client(name: str, opts: Optional[BucketOptions] = None) -> IBucketClient:
        platform_type = utils.current_platform_type()
        if platform_type == PlatformType.AWS:
            from .clients import aws

            return aws.S3Bucket(name, opts)
        else:
            raise ValueError(f"not support this runtime '{platform_type}'")
