from typing import Optional
from pluto_base.utils import gen_resource_id, get_env_val_for_property
from ...website import IWebsiteClient, Website, WebsiteOptions


class WebsiteClient(IWebsiteClient):
    def __init__(
        self,
        path: str,
        name: Optional[str] = None,
        opts: Optional[WebsiteOptions] = None,
    ):
        name = name or "default"
        self.__id = gen_resource_id(Website.fqn, name)

    def url(self) -> str:
        return get_env_val_for_property(self.__id, "url")
