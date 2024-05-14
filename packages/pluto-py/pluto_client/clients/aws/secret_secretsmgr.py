import boto3
from pluto_base.utils.resource_id import gen_resource_id
from pluto_client.clients.aws.utils import gen_aws_resource_name
from ...secret import ISecretClient, Secret as SecretProto


class Secret(ISecretClient):
    def __init__(self, name: str, value: str):
        self.__name = name
        self.__id = gen_resource_id(SecretProto.fqn, name)
        self.__secret_name = gen_aws_resource_name(self.__id)
        self.__client = boto3.client("secretsmanager")

    def get(self) -> str:
        resp = self.__client.get_secret_value(SecretId=self.__secret_name)
        if "SecretString" in resp:
            return resp["SecretString"]
        raise ValueError(f"No secret value found for secret: '{self.__name}'")
