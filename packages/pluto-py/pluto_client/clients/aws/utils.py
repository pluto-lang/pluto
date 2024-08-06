import re
import json
import boto3
import hashlib

RESOURCE_NAME_MAX_LENGTH = 50


def gen_aws_resource_name(*parts: str) -> str:
    resource_full_id = re.sub(r"[^-0-9a-zA-Z]+", "-", "_".join(parts)).lower()

    if len(resource_full_id) <= RESOURCE_NAME_MAX_LENGTH:
        return resource_full_id.strip("-")
    else:
        hash = hashlib.md5(json.dumps(resource_full_id).encode("utf-8")).hexdigest()[:8]
        start = len(resource_full_id) - (RESOURCE_NAME_MAX_LENGTH - len(hash))
        end = len(resource_full_id)
        return (resource_full_id[start:end] + hash).strip("-")


def get_aws_account_id() -> str:
    client = boto3.client("sts")  # type: ignore
    return client.get_caller_identity().get("Account")  # type: ignore
