import os
from typing import Any, Callable, Dict, List


def handler(
    event: Any, context: Any, *args: List[Any], **kwargs: Dict[Any, Any]
) -> Any:
    account_id = context.invoked_function_arn.split(":")[4]
    os.environ["AWS_ACCOUNT_ID"] = account_id

    user_handler: Callable[..., Any] = globals()["__handler_"]
    return user_handler(event, context, *args, **kwargs)
