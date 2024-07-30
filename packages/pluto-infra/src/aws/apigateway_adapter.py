import os
import json
import base64
from typing import Any, Callable
from pluto_client import HttpRequest, HttpResponse


def handler(event: Any, context: Any):
    account_id = context.invoked_function_arn.split(":")[4]
    os.environ["AWS_ACCOUNT_ID"] = account_id

    req_body = event.get("body", "") or ""
    if event["isBase64Encoded"]:
        payload = base64.b64decode(req_body).decode("utf-8")
    else:
        payload = req_body

    headers = event.get("headers", {})
    if headers.get("Content-Type") == "application/json":
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return {
                "statusCode": 400,
                "body": "Invalid JSON payload",
            }

    request = HttpRequest(
        path=event.get("resource", ""),
        method=event.get("httpMethod", ""),
        headers=headers,
        query=event.get("queryStringParameters", {}),
        body=payload,
    )
    if os.environ.get("DEBUG"):
        print("Pluto: Handling HTTP request: ", request)

    try:
        user_handler: Callable[[HttpRequest], HttpResponse] = globals()["__handler_"]
        result = user_handler(request)
        return {"statusCode": result.status_code, "body": result.body}

    except Exception as e:
        import traceback

        print("Failed to handle http request: ")
        traceback.print_exception(type(e), e, e.__traceback__)
        return {
            "statusCode": 500,
            "body": "Something wrong. Please contact the administrator.",
        }
