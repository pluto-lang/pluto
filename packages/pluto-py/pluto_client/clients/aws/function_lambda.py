import json
import boto3
from typing import Callable, Optional
from pluto_base.utils import gen_resource_id, get_env_val_for_property
from .utils import gen_aws_resource_name
from ...function import FunctionOptions, DEFAULT_FUNCTION_NAME, Function, DirectCallResponse
from ..errors import InvokeError

successful_status_code = {
    'RequestResponse': 200,
    'Event': 202,
    'DryRun': 204,
}


class LambdaFunction:
    def __init__(self, func: Callable, opts: Optional[FunctionOptions] = None):
        self.id = gen_resource_id(
            Function.fqn, opts.name if opts else DEFAULT_FUNCTION_NAME)
        self.lambda_name = gen_aws_resource_name(self.id)
        # Placeholder for storing the function reference if necessary
        self.func = func

    def url(self) -> str:
        return get_env_val_for_property(self.id, "url")

    def invoke(self, *args) -> DirectCallResponse:
        lambda_client = boto3.client('lambda')
        params = {
            'FunctionName': self.lambda_name,
            'InvocationType': 'RequestResponse',
            'LogType': 'None',
            'Payload': json.dumps(args),
        }
        try:
            response = lambda_client.invoke(**params)
            # Check if the invocation process is successful.
            if successful_status_code[params['InvocationType']] != response['StatusCode']:
                # The invocation process has failed.
                raise Exception(
                    f"The invocation of the Lambda function '{self.id}' has failed, returning a "
                    f"status code of {response['StatusCode']} with the following function error: "
                    f"{response.get('FunctionError')}"
                )
            if response['Payload']:
                # The invocation process is successful.
                payload = json.loads(
                    response['Payload'].read().decode('utf-8'))
                if payload['code'] == 200:
                    # The function is successfully executed.
                    return payload['body']
                else:
                    # The function has failed to execute.
                    raise InvokeError(payload['body'])
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
                f"The invocation of the AWS Lambda '{self.id}' has failed.")
