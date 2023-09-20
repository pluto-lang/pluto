class Stack:
    def __init__(self, name) -> None:
        self.name = name
        self.runtime = None
        self.engine = None


class AwsRuntime:
    def __init__(self) -> None:
        self.type = "aws"
        self.region = ""
        self.account = {
            "access_key_id": "",
            "secret_access_key": ""
        }

class Project:
    def __init__(self, name) -> None:
        self.name = name
        self.stacks = []
    
    def get_stack(self, stack_name) -> Stack:
        for sta in self.stacks:
            if sta.name == stack_name:
                return sta
        return None