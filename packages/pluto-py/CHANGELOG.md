# pluto-client

## 0.0.20

feat(sdk): add support for configuring host and port for website and router resource

This change introduces the ability to specify custom host and port settings for website and router resources, enhancing flexibility during local development.

## 0.0.19

feat: remove runtime dependency for AWS account ID retrieval

The previous AWS queue resource type implementation required the `AWS_ACCOUNT_ID` environment variable to be set by the runtime handler. The setting only occurred upon receiving a request, causing a panic if the queue resource type was used globally without the `AWS_ACCOUNT_ID` being set.

This commit eliminates the need for runtime setting of `AWS_ACCOUNT_ID` by utilizing the `sts.GetCallerIdentity` API to retrieve the account ID.

## 0.0.18

chore: lint and format code

## 0.0.17

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

## 0.0.16

bump the pluto-base version to 0.0.4

## 0.0.14

enable Python execution in simulator

This commit introduces the ability to execute Python within the simulator. The resource infrastructure SDK implementation has been updated to adhere to the IResourceInfra interface, unifying the implementation for both local and cloud environments. Additionally, the Website, Tester resource type is now supported in the simulator environment.

## 0.0.13

feat(sdk): add Vercel deployment for ReactApp and Website

Enable deployment of static websites and compiled React applications to Vercel.

## 0.0.12

feat(sdk): add ReactApp resource type

Adds ReactApp resource type to support building and deploying React applications.

## 0.0.11

feat(sdk): add `Secret` resource type

## 0.0.10

feat(sdk): add Website resource type
