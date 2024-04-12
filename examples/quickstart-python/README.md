---
title: Simple web application using router, queue, and kvstore - Python
description: A simple web application built using Router, Queue, and KVStore, involving HTTP routing, message queue subscription, etc., that can be deployed to AWS or Kubernetes.
---

# Simple Web Application Using Router, Queue, and KVStore - Python

This is a Python version of the example Pluto application in the [Quick Start](../../docs/documentation/getting-started.en.md) guide. You can grab the full code from [here](./).

The application we're developing is called Timestamp Store. The overall architecture of this web application is shown in the diagram below. It mainly has two routes: 1) `/hello`, which generates a timestamp and publishes it to the message queue; 2) `/store`, which retrieves the last timestamp of accessing `/hello` from the KV database and returns it. The message queue will have a subscriber that saves the message to the KV database. This application can be deployed on AWS or Kubernetes.

<p align="center">
  <img src="../../assets/getting-started-case-arch.png" alt="case arch" width="450">
</p>

## 0 Prerequisites

If you haven't set up your Pluto development environment yet, please refer to steps 0 and 1 in the [Quick Start](../../docs/documentation/getting-started.en.md) guide for configuration. Alternatively, you can try out Pluto's [online sandbox or container](../../docs/documentation/getting-started.en.md#alternative-usage-methods).

## 1 Writing Code

First, run the following command to create a Pluto project:

```shell
pluto new
```

This command will interactively create a project; you can select programming languages, target platforms, project information, etc. Pluto will use the provided project name to create a directory. Enter the newly created project directory, and first, you need to install dependencies:

```shell
cd <project_dir>
npm install
pip install -r requirements.txt
```

There is already a simple example code in `app/main.py`, you can modify it according to your needs, or you can directly deploy to experience it.

## 2 Deployment

Before formally deploying, we need to configure the credential information of the target platform.
If your chosen platform is AWS, you can use `aws configure` to set up user credentials, or manually create a file `~/.aws/credentials` and configure it as follows:

```ini
[default]
aws_access_key_id = <your_access_key_id>
aws_secret_access_key = <your_secret_access_key>
```

In addition, Pluto will try to read your AWS configuration file `~/.aws/config` to get the default AWS Region. If there is no configuration, it will attempt to get it from the environment variable `AWS_REGION`. **If neither is configured, Pluto will return an error during the deployment.**

If your chosen target platform is Kubernetes, it is necessary to install Knative in K8s beforehand and turn off the auto-scaling to zero feature (because Pluto does not yet support Ingress forwarding to Knative serving, improvements are welcome). You can configure the required Kubernetes environment according to [this document](../../docs/dev_guide/setup-k8s-dev-env.en.md).

After the configuration is complete, simply execute the following command to deploy the application to the initially configured cloud platform:

```shell
pluto deploy
```

<p align="center">
  <img src="../../assets/getting-started-aws-arch.png" alt="aws arch" width="450">
</p>

During the deployment process, Pluto will deduce that it needs one route, one message queue, one KV database, and three function objects from the application code. Then, Pluto will automatically create the corresponding resource instances on your specified cloud platform and configure their dependencies. Taking AWS as an example, it will create one API Gateway, one SNS topic, one DynamoDB, and three Lambda functions while configuring triggers, roles, permissions, etc.

## 3 Testing

Congratulations! You have successfully deployed a complete web application. You should see the output URL address in the terminal, and you can visit this address to use the app. You can use `curl` or a browser to access this address and test whether your application is working properly. If using `curl`, you can test as follows:

```shell
curl <your_url>/hello?name=pluto
# The above URL will print out a message that a message has been published, including the access timestamp
# Example: Publish a message: pluto access at 1712654279444.
curl <your_url>/store?name=pluto
# The above URL will print out the time you last visited /hello
# Example: Fetch pluto access message: pluto access at 1712654279444.
```

## 4 Cleanup

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
