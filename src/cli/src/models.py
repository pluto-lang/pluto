class Project:
    def __init__(self, name) -> None:
        self.name = name
        self.stacks = []


class Stack:
    def __init__(self, name) -> None:
        self.name = name
        self.runtime = None


class AwsRuntime:
    def __init__(self) -> None:
        self.type = "aws"
        self.region = ""
        self.account = {
            "access_key_id": "",
            "secret_access_key": ""
        }