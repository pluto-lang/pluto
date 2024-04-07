# LangServe with Pluto Example

This example demonstrates how to use Pluto to deploy a LangServe [example application](https://github.com/langchain-ai/langserve/tree/main/examples/agent_with_history) to AWS. Pluto will set up an Api Gateway instance as the entry point for the LangServe app, and also create a Lambda instance to handle requests.

Once deployed, the LangServe app is accessible through the Api Gateway address provided by Pluto and supports invocation via LangServe’s RemoteRunnable.

Included in this example’s `app` directory are 3 files:

- `main.py`: the LangServe app adapted for Pluto.
- `client.py`: a client for the LangServe app.
- `main_origin.py`: the original implementation of LangServe's [example application](https://github.com/langchain-ai/langserve/tree/main/examples/agent_with_history), included for comparison. The original implementation uses uvicorn as a web server.

## Getting Started

To deploy this example, you can follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/pluto-lang/pluto
cd examples/langserve-agent-with-history
```

2. Install the required dependencies:

```bash
npm install
pip install -r requirements.txt
```

3. Modify the `app/main.py` file:

- You can add more routes in the `app/main.py` file, but make sure the paths do not overlap.
- Define your FastAPI application within the `return_fastapi_app` function, ensuring all code related to FastAPI is contained within this function.
- Set the `api_gateway_base_path` variable to the stage name of the API Gateway, which is defaulted to `/dev` by Pluto.

4. Deploy the application:

```bash
pluto deploy
```

This command deploys your LangServe application as a serverless app on AWS, creating an Api Gateway instance and a Lambda function instance to manage requests. The terminal will display the URL for the AWS Api Gateway, which you can visit to access your deployed app.

## Accessing the App

After deployment, modify the parameters of the RemoteRunnable in `app/client.py` to match the Api Gateway URL output by Pluto, then run the `app/client.py` file to interact with your deployed LangServe app.

If you wish to access LangServe’s built-in Playground, use a browser to navigate to `https://<your-api-gateway-url>/dev/playground`. Remember to replace `<your-api-gateway-url>` with the full URL printed by Pluto in the terminal, which includes the `/dev` suffix, resulting in a URL that contains `/dev` twice.

## Important Notes

- Pluto currently only supports single-file deployments, and does not support Stream access.
- Initial loading of LangChain dependencies might be slow, so the first access to the Playground or invocation of the LangServe service could be delayed and may time out after 30 seconds. If you encounter timeout issues on the first attempt, please try again.
