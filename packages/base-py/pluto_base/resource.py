from abc import ABC
from typing import Callable, List, Type

_empty_lambda: Callable[..., None] = lambda *args, **kwargs: None


class IResourceClientApi(ABC):
    pass


class IResourceInfraApi(ABC):
    pass


class IResourceCapturedProps(ABC):
    pass


class IResource(ABC):
    fqn: str
    """
    Fully qualified name of the resource type. It should be same between the client and the infra
    sdk.
    """
    _client: IResourceClientApi | IResourceCapturedProps | None
    """
    The client implemention of the resource for the specific cloud provider. 
    
    The type of this attribute should be (IResourceClientApi & IResourceCapturedProps), but mypy
    doesn't support this.
    """
    _infra_iface: Type[IResourceInfraApi] | None
    """
    The interface that contains the infrastructure API of the resource. This is used to check if an
    infrastructure API is called during runtime. If it is called, the call will be skipped.
    """

    def __get_infra_apis(self) -> List[str]:
        """
        Get a list of infrastructure APIs defined in the resource's infrastructure interface.

        Returns:
            A list of strings representing the names of the user defined infrastructure APIs.

        Raises:
            ValueError: If multiple classes that inherit from IResourceInfraApi are found.
        """

        infra_iface: Type[IResourceInfraApi] | None = None

        # Try to get the _infra_iface attribute from self, if user has set it, use it.
        try:
            infra_iface = self._infra_iface
        except:
            pass

        if infra_iface is None:
            # If the _infra_iface attribute doesn't exist, try to find the class that is a subclass
            # of IResourceInfraApi and not a subclass of IResourceClientApi or
            # IResourceCapturedProps.

            # First, get all the classes that are a subclass of IResourceInfraApi.
            infra_iface_clses: List[Type[IResourceInfraApi]] = [
                klass
                for klass in self.__class__.mro()
                if issubclass(klass, IResourceInfraApi)
            ]

            # Second, find the class that is a subclass of IResourceInfraApi and not a subclass of
            # IResourceClientApi or IResourceCapturedProps
            for klass in infra_iface_clses:
                if klass == IResourceInfraApi:
                    # Skip the IResourceInfraApi class itself.
                    continue

                if not issubclass(klass, IResourceClientApi) and not issubclass(
                    klass, IResourceCapturedProps
                ):
                    if infra_iface is not None:
                        # Found multiple classes that inherit from IResourceInfraApi.
                        raise ValueError(
                            "Multiple base classes that inherit from IResourceInfraApi are found."
                        )
                    infra_iface = klass

            # Set the _infra_iface attribute to the found class.
            if infra_iface is not None:
                super().__setattr__("_infra_iface", infra_iface)

        # If the _infra_iface attribute is still None, return an empty list.
        if infra_iface is None:
            return []

        # Get all the user defined infrastructure APIs.
        # RULE: The infrastructure APIs should not start with "__".
        infra_apis = [
            func
            for func in dir(infra_iface)
            if callable(getattr(infra_iface, func)) and not func.startswith("__")
        ]
        return infra_apis

    def __getattribute__(self, name: str):
        if name == "fqn" or name.startswith("_"):
            return super().__getattribute__(name)

        # Check if the attribute is an infrastructure API, if it is, return an empty lambda.
        infra_apis = self.__get_infra_apis()
        if name in infra_apis:
            return _empty_lambda

        # Try to get the attribute from the client, if it doesn't exist, return the attribute of
        # self. This is to make sure that the client is the first priority.
        try:
            return getattr(self._client, name)
        except:
            # If the _client doesn't exist, or the attribute doesn't exist in the client, return the
            # attribute of self.
            return super().__getattribute__(name)
