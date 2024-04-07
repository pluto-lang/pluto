import os
from typing import Callable


def handler(event, context, *args, **kwargs):
    account_id = context.invoked_function_arn.split(":")[4]
    os.environ["AWS_ACCOUNT_ID"] = account_id

    user_handler: Callable = globals()["__handler_"]
    return user_handler(event, context, *args, **kwargs)
