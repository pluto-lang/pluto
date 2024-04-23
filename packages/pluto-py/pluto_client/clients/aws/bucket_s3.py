import boto3
from typing import Optional
from pluto_base import utils
from botocore.exceptions import NoCredentialsError, ClientError
from ...bucket import Bucket, BucketOptions, IBucketClient
from .utils import gen_aws_resource_name


class S3Bucket(IBucketClient):
    def __init__(self, name: str, opts: Optional[BucketOptions] = None):
        self.__id = utils.gen_resource_id(Bucket.fqn, name)
        self.__bucket_name = gen_aws_resource_name(self.__id)
        self.__client = boto3.client("s3")

    def put(self, file_key: str, file_path: str):
        try:
            self.__client.upload_file(file_path, self.__bucket_name, file_key)
        except FileNotFoundError:
            raise FileNotFoundError("The file was not found.")
        except NoCredentialsError:
            raise

    def get(self, file_key: str, file_path: str):
        try:
            self.__client.download_file(self.__bucket_name, file_key, file_path)
        except ClientError as e:
            if e.response["Error"]["Code"] == "404":
                raise FileNotFoundError("The object does not exist.")
            else:
                raise
