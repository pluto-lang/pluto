#!/bin/bash

DIND_IMAGE_NAME=plutolang/dind:latest

# Check if the dind image exists, if not, build it
if ! docker manifest inspect $DIND_IMAGE_NAME >/dev/null 2>&1; then
  echo "DIND image does not exist, building it..."
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg BASE_IMAGE=ubuntu:22.04 \
    -t ${DIND_IMAGE_NAME} \
    -f docker/Dockerfile.dind \
    --push \
    .

  if [ $? -ne 0 ]; then
    echo "Failed to build dind image"
    exit 1
  fi
fi
