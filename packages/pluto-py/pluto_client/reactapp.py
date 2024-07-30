from typing import Optional
from dataclasses import dataclass
from .website import Website, WebsiteOptions, IWebsiteClient


@dataclass
class ReactAppOptions(WebsiteOptions):
    """
    The options for instantiating a resource class.
    """

    buildDir: Optional[str] = "build"
    """
    The directory path to the React app build output, relative to the project path.
    """

    buildCommand: Optional[str] = "npm run build"
    """
    The command for building the React app.
    """


class ReactApp(Website):
    fqn = "@plutolang/pluto.ReactApp"

    def __init__(
        self,
        project_path: str,
        name: Optional[str] = None,
        options: Optional[ReactAppOptions] = None,
    ):
        self._client = Website(project_path, name, options)
