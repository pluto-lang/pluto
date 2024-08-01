from typing import Any, Callable

import pytest
from pluto_base import resource


class ResourceInfraApi(resource.IResourceInfraApi):
    def infra_api_1(self) -> Any:
        pass

    def infra_api_2(self, _a: Any) -> int:
        raise NotImplementedError


class ResourceClientApi(resource.IResourceClientApi):
    def client_api(self) -> Any:
        pass


class ResourceCapturedProps(resource.IResourceCapturedProps):
    pass


class ResourceClient(ResourceClientApi, ResourceCapturedProps):
    pass


class ResourceInfra(ResourceInfraApi, ResourceCapturedProps):
    pass


class Resource(resource.IResource, ResourceClient, ResourceInfra):
    def client_api(self) -> Any:
        return "client_api"


def test_exec_infra_api_without_args():
    """
    Test to execute an infrastructure API without arguments.
    """
    r = Resource()

    result = r.infra_api_1()
    assert isinstance(r.infra_api_1, Callable)
    assert result is None


def test_exec_infra_api_with_args():
    """
    Test to execute an infrastructure API with arguments.
    """
    r = Resource()

    result = r.infra_api_2(1)
    assert isinstance(r.infra_api_2, Callable)
    assert result is None


def test_exec_not_exist_infra_api():
    """
    Test to execute a non-existing infrastructure API. It should raise an exception.
    """
    r = Resource()

    with pytest.raises(Exception):
        r.infra_api()


def test_exec_client_api():
    """
    Test to execute a client API.
    """
    r = Resource()

    result = r.client_api()
    assert isinstance(r.client_api, Callable)
    assert result == "client_api"
