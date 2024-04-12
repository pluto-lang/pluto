OPENAI_API_KEY="<your-openai-api-key>"
AWS_ACCESS_KEY_ID="<your-aws-access-key-id>"
AWS_SECRET_ACCESS_KEY="<your-aws-secret-access-key>"
AWS_REGION="us-east-1"

# Prepare the modified code of LangServe application
MODIFIED_CODE=$(cat <<EOF
from fastapi import FastAPI
from langchain.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langserve import add_routes
from langchain.pydantic_v1 import SecretStr

from mangum import Mangum
from pluto_client import Router

OPENAI_API_KEY = SecretStr("${OPENAI_API_KEY}")

model = ChatOpenAI(api_key=OPENAI_API_KEY)
prompt = ChatPromptTemplate.from_template("tell me a joke about {topic}")

def return_fastapi_app():
    # The langserve depends on this, but it may not come pre-installed.
    # So, we write it here to ensure it is installed.
    import sse_starlette

    app = FastAPI(
      title="LangChain Server",
      version="1.0",
      description="A simple api server using Langchain's Runnable interfaces",
    )

    add_routes(
      app,
      ChatOpenAI(api_key=OPENAI_API_KEY),
      path="/openai",
    )

    add_routes(
      app,
      ChatOpenAI(api_key=OPENAI_API_KEY),
      path="/dev/openai",
    )

    add_routes(
      app,
      prompt | model,
      path="/joke",
    )

    add_routes(
      app,
      prompt | model,
      path="/dev/joke",
    )

    return app


def raw_handler(*args, **kwargs):
    handler = Mangum(return_fastapi_app(), api_gateway_base_path="/dev")
    return handler(*args, **kwargs)


router = Router("router_name")
router.all("/*", raw_handler, raw=True)
EOF
)

# Prepare the package.json file, used by the Pluto
PACKAGE_JSON=$(cat <<EOF
{
  "name": "my-app",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "test:dev": "pluto test --sim",
    "test:prod": "pluto test",
    "deploy": "pluto deploy",
    "destroy": "pluto destroy"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20",
    "typescript": "^5.2.2",
    "@plutolang/base": "latest",
    "@plutolang/pluto-infra": "latest",
    "@pulumi/pulumi": "^3.88.0"
  },
  "main": "dist/index.js"
}
EOF
)

# Prepare the Pluto configuration file
PLUTO_YML=$(cat <<EOF
current: aws
language: python
stacks:
  - configs: {}
    name: aws
    platformType: AWS
    provisionType: Pulumi
EOF
)

# Prepare the AWS credentials
AWS_CREDENTIALS=$(cat <<EOF
[default]
aws_access_key_id = ${AWS_ACCESS_KEY_ID}
aws_secret_access_key = ${AWS_SECRET_ACCESS_KEY}
EOF
)

# Prepare the AWS configuration
AWS_CONFIG=$(cat <<EOF
[default]
region = ${AWS_REGION}
EOF
)

# Prepare the script to run inside the Docker container
cat <<EOF1 > script.sh
#!/bin/bash

apt update
apt install -y git

pip install langchain-cli poetry

langchain app new --non-interactive my-app
cd my-app

cat << EOF2 > app/server.py
${MODIFIED_CODE}
EOF2

cat << EOF3 > package.json
${PACKAGE_JSON}
EOF3

mkdir -p .pluto
cat << EOF4 > .pluto/pluto.yml
${PLUTO_YML}
EOF4

npm install
sed -i 's/\^3.11/\^3.10/' pyproject.toml
poetry add pluto-client mangum langchain-openai

mkdir -p ~/.aws
cat << EOF5 > ~/.aws/credentials
${AWS_CREDENTIALS}
EOF5
cat << EOF6 > ~/.aws/config
${AWS_CONFIG}
EOF6

source \$(poetry env info --path)/bin/activate
pluto deploy -y --force app/server.py

bash
EOF1

# Run the script inside the Docker container
docker run -it --rm \
  --platform linux/amd64 \
  -v $(pwd)/script.sh:/script.sh \
  plutolang/pluto:latest bash -c "bash /script.sh"
