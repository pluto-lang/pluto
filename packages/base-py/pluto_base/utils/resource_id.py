import hashlib
from .configuration import current_project_name, current_stack_name

RESOURCE_ID_MAX_LENGTH = 64


def gen_resource_id(*args):
    """
    Construct a string to serve as the resource ID. This is assembled using the project name, stack
    name, type of resource, and the resource's own name.
    """
    if len(args) not in (2, 4):
        raise ValueError("Invalid arguments.")

    if len(args) == 2:
        args = (current_project_name(), current_stack_name()) + args

    resource_full_id = "_".join(args).replace(r'[^_0-9a-zA-Z]+', '_')

    if len(resource_full_id) <= RESOURCE_ID_MAX_LENGTH:
        return resource_full_id
    else:
        # Create a hash of the full resource ID
        hash_digest = hashlib.md5(
            resource_full_id.encode('utf-8')).hexdigest()[:8]
        # Preserve the final segment of the resource ID, appending the hash to it
        start = len(resource_full_id) - \
            (RESOURCE_ID_MAX_LENGTH - len(hash_digest))
        end = len(resource_full_id)
        return resource_full_id[start:end] + hash_digest
