# FastAPI with Pluto Example

This is an example application that shows how to adapt a FastAPI application with Pluto.

## Prerequisites

- pulumi
  - You can install it according to the [installation guide](https://www.pulumi.com/docs/install/).
- pluto
  - You can install it with `npm i -g @plutolang/cli`.

## Getting Started

To get started with this example, follow the steps below:

1. Clone the repository:

```bash
git clone https://github.com/pluto-lang/pluto
cd examples/fastapi
```

2. Install the required dependencies:

```bash
npm install
pip install -r requirements.txt
```

3. Modify the `app/main.py` file:

- Define your FastAPI application within the `return_app` function, ensuring that all routes are defined within this function.
- Set the `api_gateway_base_path` variable to the stage name of your API gateway. Currently, the default stage name for Pluto deployment is `/dev`.

4. Deploy the application:

```bash
pluto deploy
```

This will deploy your FastAPI application as a serverless application. It will create an API Gateway instance and a Lambda function to handle the requests. You can access the deployed application by visiting the URL provided by Pluto.

## Note

The FastAPI application must be returned from a function, and the routes should be defined inside that function. This is because Pluto will find the dependencies of the infrastructure method call `router.all` and encapsulate all the dependencies into a single code bundle. If the FastAPI application is defined outside the function, Pluto will only find the application object, and the routes will be missed. So, the routes will not be included in the final code bundle.

`app/main_best.py` showcases the optimal interface for integrating Pluto with FastAPI applications via the SDK, but it's not yet implemented.
