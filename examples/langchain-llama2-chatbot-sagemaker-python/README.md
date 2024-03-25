# Building a Llama2 Conversational Chatbot with AWS and LangChain

The difference between this and the [TypeScript version of the Pluto example](../langchain-llama2-chatbot-sagemaker/) lies in its implementation in Python, which has not yet been successfully deployed. The issues encountered include:

1. When deploying across platforms, dependencies such as Numpy and Pydantic cannot be correctly installed on the target platform.
2. The size of the compressed package exceeds the AWS Lambda limit of 50MB.
