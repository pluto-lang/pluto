import re
import hashlib
from .configuration import current_project_name, current_stack_name

RESOURCE_ID_MAX_LENGTH = 64


def gen_resource_id(
    resource_type: str,
    provided_name: str,
    project_name: str | None = None,
    stack_name: str | None = None,
) -> str:
    """
    Construct a string to serve as the resource ID. This is assembled using the project name, stack
    name, type of resource, and the resource's own name.

    Args:
        resource_type (str): The type of the resource.
        provided_name (str): The user provided name of the resource.
        project_name (str | None, optional): The project name. Defaults to None.
        stack_name (str | None, optional): The stack name. Defaults to None.

    Returns:
        str: The generated resource ID.
    """
    args = (
        project_name or current_project_name(),
        stack_name or current_stack_name(),
        resource_type,
        provided_name,
    )
    resource_full_id = re.sub(r"[^_0-9a-zA-Z]+", "_", "_".join(args))

    if len(resource_full_id) <= RESOURCE_ID_MAX_LENGTH:
        return resource_full_id
    else:
        # Create a hash of the full resource ID
        hash_digest = hashlib.md5(resource_full_id.encode("utf-8")).hexdigest()[:8]
        # Preserve the final segment of the resource ID, appending the hash to it
        start = len(resource_full_id) - (RESOURCE_ID_MAX_LENGTH - len(hash_digest))
        end = len(resource_full_id)
        return resource_full_id[start:end] + hash_digest
