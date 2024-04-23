import boto3
import json
from typing import Any, Optional
from pluto_base.utils import gen_resource_id, get_env_val_for_property
from .utils import gen_aws_resource_name
from ...sagemaker import ISageMakerClient, SageMakerOptions, SageMaker as SageMakerProto


class SageMaker(ISageMakerClient):
    def __init__(
        self, name: str, image_uri: str, opts: Optional[SageMakerOptions] = None
    ):
        self.__id = gen_resource_id(SageMakerProto.fqn, name)
        self.client = boto3.client("sagemaker-runtime")

    @property
    def endpoint_name(self) -> str:
        return gen_aws_resource_name(self.__id, "endpoint")

    def invoke(self, input_data: Any) -> Any:
        response = self.client.invoke_endpoint(
            EndpointName=self.endpoint_name,
            Body=json.dumps(input_data),
            ContentType="application/json",
            Accept="application/json",
        )
        return json.loads(response["Body"].read())

    def endpoint_url(self) -> str:
        return get_env_val_for_property(self.__id, "endpointUrl")
