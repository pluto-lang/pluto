IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'
docker run -p 9000:8080 $IMAGE_NAME:http
# curl "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'