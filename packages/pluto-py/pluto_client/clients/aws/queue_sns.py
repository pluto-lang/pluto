import os
import json
import time
import boto3
from typing import Optional
from pluto_base.utils.resource_id import gen_resource_id
from pluto_client.clients.aws.utils import gen_aws_resource_name
from ...queue import CloudEvent, IQueueClient, Queue, QueueOptions


class SNSQueue(IQueueClient):
    def __init__(self, name: str, opts: Optional[QueueOptions] = None) -> None:
        self.__id = gen_resource_id(Queue.fqn, name)
        self.__topic_name = gen_aws_resource_name(self.__id)
        self.__topic_arn = self.__build_arn(self.__topic_name)
        self.__client = boto3.client("sns")

    def push(self, msg: str) -> None:
        event = CloudEvent(timestamp=time.time(), data=msg)
        self.__client.publish(
            TopicArn=self.__topic_arn, Message=json.dumps(event.__dict__)
        )

    def __build_arn(self, topic_name: str) -> str:
        region = os.environ.get("AWS_REGION")
        if not region:
            raise EnvironmentError("Missing AWS Region")

        account_id = os.environ.get("AWS_ACCOUNT_ID")
        if not account_id:
            raise EnvironmentError("Missing AWS Account ID")

        return f"arn:aws:sns:{region}:{account_id}:{topic_name}"
