IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/lambda-test'

npx tsc index.ts
docker build --tag $IMAGE_NAME --platform=linux/amd64 -f ./Dockerfile .
docker push $IMAGE_NAME

# docker run -p 3000:3000 $IMAGE_NAME

# AWS Registry Login
# aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 811762874732.dkr.ecr.us-east-1.amazonaws.com