IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'
STACK_NAME='dev'

npm run build
docker build --tag $IMAGE_NAME --platform=linux/amd64 -f ./aws.Dockerfile .
docker push $IMAGE_NAME

cd deploy/aws/
pulumi up -s $STACK_NAME -y


# AWS Registry Login
# aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 811762874732.dkr.ecr.us-east-1.amazonaws.com
