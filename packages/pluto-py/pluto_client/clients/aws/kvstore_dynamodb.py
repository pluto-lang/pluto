from typing import Optional
import boto3
from pluto_base import utils
from ...kvstore import IKVStoreClient, KVStore, KVStoreOptions
from .utils import gen_aws_resource_name


class DynamoKVStore(IKVStoreClient):
    def __init__(self, name: str, opts: Optional[KVStoreOptions] = None):
        self.__id = utils.gen_resource_id(KVStore.fqn, name)
        table_name = gen_aws_resource_name(self.__id)
        self.__client = boto3.resource("dynamodb").Table(table_name)

    def get(self, key: str) -> str:
        response = self.__client.get_item(Key={"Id": key})
        if "Item" not in response:
            raise ValueError(f"There is no target key-value pair, Key: {key}.")
        return response["Item"]["Value"]

    def set(self, key: str, val: str):
        self.__client.put_item(Item={"Id": key, "Value": val})
