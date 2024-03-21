import json
import os
from typing import Callable
from pluto_client import CloudEvent


def handler(event, context):
    account_id = context.invoked_function_arn.split(":")[4]
    os.environ["AWS_ACCOUNT_ID"] = account_id

    for record in event["Records"]:
        if "Sns" not in record:
            raise ValueError(f"Unsupported event type {json.dumps(record)}")

        payload = record["Sns"]["Message"]
        data = json.loads(payload)
        cloud_event = CloudEvent(timestamp=data["timestamp"], data=data["data"])
        print("Pluto: Handling event: ", cloud_event)

        try:
            user_handler: Callable[[CloudEvent], None] = globals()["__handler_"]
            user_handler(cloud_event)
        except Exception as e:
            print("Pluto: Failed to handle event: ", cloud_event, e)
