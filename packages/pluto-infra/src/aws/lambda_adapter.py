import os
import json
import base64
import traceback


def is_http_payload(payload):
    return (
        payload is not None
        and isinstance(payload, dict)
        and "headers" in payload
        and "queryStringParameters" in payload
        and "rawPath" in payload
    )


def handler(payload, context):
    account_id = context.invoked_function_arn.split(":")[4]
    os.environ["AWS_ACCOUNT_ID"] = account_id
    try:
        if os.environ.get("DEBUG"):
            print("Payload:", payload)
        if is_http_payload(payload):
            if payload["isBase64Encoded"]:
                body = base64.b64decode(payload["body"]).decode("utf-8")
            else:
                body = payload["body"]
            payload = json.loads(body)

        if not isinstance(payload, list):
            return {
                "code": 400,
                "body": "Payload should be an array.",
            }

        try:
            user_handler = globals()["__handler_"]
            result = user_handler(*payload)
            response = {
                "code": 200,
                "body": result,
            }
        except Exception as e:
            print("Function execution failed")
            print(traceback.print_exception(type(e), e, e.__traceback__))
            response = {
                "code": 400,
                "body": "Function execution failed: " + str(e),
            }
        return response

    except Exception as e:
        print("Internal Server Error")
        print(traceback.print_exception(type(e), e, e.__traceback__))
        return {
            "code": 500,
            "body": "Internal Server Error. Please Contact the Administrator.",
        }
