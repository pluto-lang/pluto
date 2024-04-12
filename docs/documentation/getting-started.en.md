# Quick Start

Let's quickly understand the Pluto app development process by building a simple web application. If you prefer not to set up the development environment locally, you can experience it using our provided [online sandbox or container](#alternative-usage-methods), where the environment is already configured with the software installed in steps 0 and 1.

The application we're developing is called Timestamp Store. The overall architecture of this web application is shown in the diagram below. It mainly has two routes: 1) `/hello`, which generates a timestamp and publishes it to the message queue; 2) `/store`, which retrieves the last timestamp of accessing `/hello` from the KV database and returns it. The message queue will have a subscriber that saves the message to the KV database. This application can be deployed on AWS or Kubernetes.

<p align="center">
  <img src="../../assets/getting-started-case-arch.png" alt="case arch" width="450">
</p>

After completing this example, you will understand the basic workflow of Pluto application development and can start using Pluto to develop your own cloud applications.

## 0 Prerequisites

- [Node.js](https://nodejs.org/): Pluto runs in the Node.js environment, it is recommended to use version 20 or above.
- [Pulumi](https://www.pulumi.com/docs/install/): Pluto interacts with cloud platforms (AWS or K8s) and deploys cloud resources using Pulumi. Please refer to the Pulumi installation documentation.
- [Python](https://www.python.org/): If you plan to develop a Python application, you need to install Python, preferably version 3.10 or above.

## 1 Installation

The Pluto command-line tool can be installed using [npm](https://www.npmjs.com/):

```shell
npm install -g @plutolang/cli
```

Pluto's command is `pluto`, you can verify the successful installation with the following command:

```shell
pluto --help
```

## 2 Writing Code

First, run the following command to create a Pluto project:

```shell
pluto new
```

This command will interactively create a project; you can select programming languages, target platforms, project information, etc. Pluto will use the provided project name to create a directory. Enter the newly created project directory, and first, you need to install dependencies:

```shell
cd <project_dir>
npm install

# If it's a Python project, in addition to npm install, you also need to install Python dependencies
pip install -r requirements.txt
```

There is already a simple example code in `src/index.ts` or `app/main.py`, you can modify it according to your needs, or you can directly deploy to experience it.

## 3 Deployment

Before formally deploying, we need to configure the credential information of the target platform.
If your chosen platform is AWS, you can use `aws configure` to set up user credentials, or manually create a file `~/.aws/credentials` and configure it as follows:

```ini
[default]
aws_access_key_id = <your_access_key_id>
aws_secret_access_key = <your_secret_access_key>
```

In addition, Pluto will try to read your AWS configuration file `~/.aws/config` to get the default AWS Region. If there is no configuration, it will attempt to get it from the environment variable `AWS_REGION`. **If neither is configured, Pluto will return an error during the deployment.**

If your chosen target platform is Kubernetes, it is necessary to install Knative in K8s beforehand and turn off the auto-scaling to zero feature (because Pluto does not yet support Ingress forwarding to Knative serving, improvements are welcome). You can configure the required Kubernetes environment according to [this document](../dev_guide/setup-k8s-dev-env.en.md).

After the configuration is complete, simply execute the following command to deploy the application to the initially configured cloud platform:

```shell
pluto deploy
```

<p align="center">
  <img src="../../assets/getting-started-aws-arch.png" alt="aws arch" width="450">
</p>

During the deployment process, Pluto will deduce that it needs one route, one message queue, one KV database, and three function objects from the application code. Then, Pluto will automatically create the corresponding resource instances on your specified cloud platform and configure their dependencies. Taking AWS as an example, it will create one API Gateway, one SNS topic, one DynamoDB, and three Lambda functions while configuring triggers, roles, permissions, etc.

## 4 Testing

Congratulations! You have successfully deployed a complete web application. You should see the output URL address in the terminal, and you can visit this address to use the app. You can use `curl` or a browser to access this address and test whether your application is working properly. If using `curl`, you can test as follows:

```shell
curl <your_url>/hello?name=pluto
# The above URL will print out a message that a message has been published, including the access timestamp
# Example: Publish a message: pluto access at 1712654279444.
curl <your_url>/store?name=pluto
# The above URL will print out the time you last visited /hello
# Example: Fetch pluto access message: pluto access at 1712654279444.
```

## 5 Cleanup

If you want to take down the application from the cloud platform, you can use the following command:

```shell
pluto destroy
```

## Multi-platform Deployment

If you wish to deploy to other cloud platforms, you can do so by creating a new stack and specifying the stack during deployment.

Creating a new stack:

```shell
pluto stack new
```

Deploying with a specified stack:

```shell
pluto deploy --stack <new_stack>
```

## Alternative Usage Methods

### Online Sandbox

If you do not want to configure the Pluto environment locally, you can use the online IDE provided by CodeSandbox to experience the Pluto development process. We offer TypeScript and Python templates, and the sandbox environment has already installed AWS CLI, Pulumi, Pluto, and other basic dependencies. You can directly edit the code in your browser and deploy the app to AWS cloud platform by following the instructions in the template application's README.

- [TypeScript Template | CodeSandbox](https://codesandbox.io/p/devbox/github/pluto-lang/codesandbox/tree/main/typescript?file=/README_zh.md)
- [Python Template | CodeSandbox](https://codesandbox.io/p/devbox/github/pluto-lang/codesandbox/tree/main/python?file=/README_zh.md)

### Container

Pluto provides a container image `plutolang/pluto:latest` for application development. The image includes AWS CLI, Pulumi, Pluto, and other basic dependencies and is configured with Node.js 20.x and Python 3.10 environments. If you are only interested in developing TypeScript applications, you can use the `plutolang/pluto:latest-typescript` image. After pulling the image, you can experience Pluto development in the container by executing the following command:

```shell
docker run -it --name pluto-app plutolang/pluto:latest bash
```

## More Examples

- TypeScript example applications:
  - [Conversation chatbot based on LangChain, Llama2, DynamoDB, SageMaker](https://github.com/pluto-lang/pluto/tree/main/examples/langchain-llama2-chatbot-sagemaker)
  - [Chatbot leveraging the OpenAI API](https://github.com/pluto-lang/pluto/tree/main/examples/chat-bot)
  - [Daily Joke Slack Bot](https://github.com/pluto-lang/pluto/tree/main/examples/daily-joke-slack)
- Python example applications:
  - [Deploy a FastAPI app to AWS](https://github.com/pluto-lang/pluto/tree/main/examples/fastapi)
  - [Deploy a LangServe example agent to AWS](https://github.com/pluto-lang/pluto/tree/main/examples/deploy-langserve-to-aws)
  - [Conversational chatbot based on LangChain, Llama2, DynamoDB, SageMaker](https://github.com/pluto-lang/pluto/tree/main/examples/langchain-llama2-chatbot-sagemaker-python)
