IMAGE_NAME='811762874732.dkr.ecr.us-east-1.amazonaws.com/pulumi-dapr'

rsync -aP ../../dapr/cli/dist/dapr-linux-amd64 .dapr/./bin/dapr
rsync -aP ../../dapr/dapr/dist/daprd-linux-amd64-aws-static .dapr/bin/daprd

rm -r dist/
npm run build

docker build --platform=linux/amd64 --tag $IMAGE_NAME:http  --build-arg CIR_DIR=/app/cir/http .
docker push $IMAGE_NAME:http

docker build --platform=linux/amd64 --tag $IMAGE_NAME:sub  --build-arg CIR_DIR=/app/cir/sub .
docker push $IMAGE_NAME:sub


# docker run -p 3000:3000 $IMAGE_NAME

# AWS Registry Login
# aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 811762874732.dkr.ecr.us-east-1.amazonaws.com
