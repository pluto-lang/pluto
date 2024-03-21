import os
from ..platform import PlatformType
from ..provision import ProvisionType


def system_config_dir():
    """Returns the path to the global configuration directory."""
    return os.path.join(os.path.expanduser("~"), ".pluto")


def current_project_name():
    return _fetch_env_with_throw("PLUTO_PROJECT_NAME")


def current_stack_name():
    return _fetch_env_with_throw("PLUTO_STACK_NAME")


def current_platform_type() -> PlatformType:
    val = _fetch_env_with_throw("PLUTO_PLATFORM_TYPE")
    if is_platform_type(val):
        return PlatformType(val)
    raise ValueError(f"The '{val}' is not a valid platform type.")


def current_engine_type() -> ProvisionType:
    val = _fetch_env_with_throw("PLUTO_PROVISION_TYPE")
    if is_engine_type(val):
        return ProvisionType(val)
    raise ValueError(f"The '{val}' is not a valid provisioning engine type.")


def _fetch_env_with_throw(name: str):
    value = os.environ.get(name)
    if not value:
        raise EnvironmentError(f"The environment variable {name} is not set.")
    return value


def is_platform_type(value: str) -> bool:
    return value in PlatformType.__members__


def is_engine_type(value: str) -> bool:
    return value in ProvisionType.__members__
