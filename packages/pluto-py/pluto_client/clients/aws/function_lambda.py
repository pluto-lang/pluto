import json
import boto3
from typing import Optional, Any
from pluto_base.utils import gen_resource_id, get_env_val_for_property
from .utils import gen_aws_resource_name
from ...function import (
    FnHandler,
    FunctionOptions,
    DEFAULT_FUNCTION_NAME,
    Function,
    IFunctionClient,
)
from ..errors import InvokeError

successful_status_code = {
    "RequestResponse": 200,
    "Event": 202,
    "DryRun": 204,
}


class LambdaFunction(IFunctionClient[FnHandler]):
    def __init__(
        self,
        func: FnHandler,
        name: Optional[str] = None,
        opts: Optional[FunctionOptions] = None,
    ):
        name = name or DEFAULT_FUNCTION_NAME
        self.__id = gen_resource_id(Function.fqn, name)
        self.__lambda_name = gen_aws_resource_name(self.__id)

    def url(self) -> str:
        return get_env_val_for_property(self.__id, "url")

    def invoke(self, *args, **kwargs) -> Any:
        lambda_client = boto3.client("lambda")
        params = {
            "FunctionName": self.__lambda_name,
            "InvocationType": "RequestResponse",
            "LogType": "None",
            "Payload": json.dumps(args),
        }
        try:
            response = lambda_client.invoke(**params)
            # Check if the invocation process is successful.
            if (
                successful_status_code[params["InvocationType"]]
                != response["StatusCode"]
            ):
                # The invocation process has failed.
                raise Exception(
                    f"The invocation of the Lambda function '{self.__id}' has failed, returning a "
                    f"status code of {response['StatusCode']} with the following function error: "
                    f"{response.get('FunctionError')}"
                )
            if response["Payload"]:
                # The invocation process is successful.
                payload = json.loads(response["Payload"].read().decode("utf-8"))
                if payload["code"] == 200:
                    # The function is successfully executed.
                    return payload["body"]
                else:
                    # The function has failed to execute.
                    raise InvokeError(payload["body"])
            else:
                # The invocation process is successful, but the payload is empty.
                raise Exception(
                    "The invocation of the Lambda function has failed, returning an empty payload."
                )
        except InvokeError as e:
            # Re-throw the InvokeError came from inside the user function.
            raise e
        except Exception as e:
            print("Error calling Lambda function:", e)
            raise Exception(
                f"The invocation of the AWS Lambda '{self.__id}' has failed."
            )
