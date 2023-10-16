import getpass

from models import Project, Stack, AwsRuntime, K8sRuntime
from config import save_project_config, get_project_config


def process_stack(args):
    proj = get_project_config()
    stack = create_stack()
    proj.stacks.append(stack)
    save_project_config(f'./', proj)
    print("Created new stack.")


def create_stack() -> Stack:
    stack_name = input("Stack Name(dev): ") or "dev"
    runtime_type = input("Runtime(aws): ") or "aws"

    stack = Stack(stack_name)
    runtime = build_runtime(runtime_type)
    stack.runtime = runtime

    return stack


def build_runtime(type):
    runtime_builder_mapping = {
        "aws": build_aws_runtime,
        "k8s": build_k8s_runtime
    }
    return runtime_builder_mapping[type]()


def build_aws_runtime():
    region = input("Region(us-east-1): ") or "us-east-1"
    access_key_id = getpass.getpass("AWS Access Key ID: ")
    if access_key_id == "":
        print("AWS Access Key ID cannot be empty.")
        exit(1)

    secret_access_key = getpass.getpass("AWS Secret Access Key: ")
    if secret_access_key == "":
        print("AWS Secret Access Key cannot be empty.")
        exit(1)

    runtime = AwsRuntime()
    runtime.region = region
    runtime.account["access_key_id"] = access_key_id
    runtime.account["secret_access_key"] = secret_access_key
    return runtime


def build_k8s_runtime():
    runtime = K8sRuntime()
    return runtime
