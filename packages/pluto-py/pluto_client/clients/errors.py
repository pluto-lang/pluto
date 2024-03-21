class InvokeError(Exception):
    """The error thrown inside a user function"""

    def __init__(self, message: str):
        super().__init__(message)
        self.name = "InvokeError"
