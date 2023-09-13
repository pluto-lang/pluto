IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'
docker run -p 9000:8080 -e CIR_DIR=/app/anonymous-handler-1.js -e RUNTIME_TYPE='aws' $IMAGE_NAME:latest
# curl "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'