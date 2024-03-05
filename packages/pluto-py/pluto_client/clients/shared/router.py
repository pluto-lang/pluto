from typing import Optional
from pluto_base.utils import gen_resource_id, get_env_val_for_property
from ...router import IRouterClient, Router, RouterOptions


class RouterClient(IRouterClient):
    def __init__(self, name: str, opts: Optional[RouterOptions] = None):
        self.__id = gen_resource_id(Router.fqn, name)

    def url(self) -> str:
        return get_env_val_for_property(self.__id, "url")
