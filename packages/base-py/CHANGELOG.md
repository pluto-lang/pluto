# pluto-base

## 0.0.5

refactor: replace build_client with constructor usage

Replace `build_client` function with direct constructor instantiation in resource class to simplify client creation and testing integration. The previous approach used `build_client` to select the correct implementation based on runtime type, which caused inconsistencies between the user programming interface and the execution environment. This change introduces a more uniform execution process by initializing a new client instance as the `_client` attribute via the constructor.

To ensure proper runtime behavior, we now proxy method calls from the resource class instance to the `_client` attribute. This proxying is achieved using the `__getattribute__` method in the `IResource` class, ensuring all subclasses of `IResource` inherit this functionality unless they override `__getattribute__`. The pluto sdk should prohibit such overrides to maintain consistent behavior.

```python
def __getattribute__(self, name: str):
    if name == "fqn":
        return super().__getattribute__(name)

    # Try to get the attribute from the client, if it doesn't exist, return the attribute of
    # self. This is to make sure that the client is the first priority.
    try:
        client = super().__getattribute__("_client")
        return getattr(client, name)
    except:
        # If the _client doesn't exist, or the attribute doesn't exist in the client, return the
        # attribute of self.
        return super().__getattribute__(name)
```

## 0.0.4

chore: update requests dependency to version 2.32.3

## 0.0.3

enable Python execution in simulator

This commit introduces the ability to execute Python within the simulator. The resource infrastructure SDK implementation has been updated to adhere to the IResourceInfra interface, unifying the implementation for both local and cloud environments. Additionally, the Website, Tester resource type is now supported in the simulator environment.
