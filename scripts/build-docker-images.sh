#!/bin/bash

# Set default values
PLUTO_VERSION=0.4.7
NODEJS_VERSION=20.x
PYTHON_VERSION=3.10

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pluto)
      PLUTO_VERSION="$2"
      shift 2
      ;;
    --nodejs)
      NODEJS_VERSION="$2"
      shift 2
      ;;
    --python)
      PYTHON_VERSION="$2"
      shift 2
      ;;
    *)
      echo "Invalid argument: $1"
      exit 1
      ;;
  esac
done

echo "Building images for Pluto version ${PLUTO_VERSION}, Node.js version ${NODEJS_VERSION}, and Python version ${PYTHON_VERSION}"

# Set image names
PLATFORMS=linux/amd64,linux/arm64
IMAGE_REPO=plutolang/pluto

TYPESCRIPT_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-typescript-nodejs${NODEJS_VERSION}
TYPESCRIPT_LATEST_IMAGE=${IMAGE_REPO}:latest-typescript

PYTHON_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-python-${PYTHON_VERSION}
PYTHON_LATEST_IMAGE=${IMAGE_REPO}:latest-python
PLUTO_LATEST_IMAGE=${IMAGE_REPO}:latest

# Build the base image
docker buildx build \
  --platform ${PLATFORMS} \
  --build-arg NODEJS_VERSION=${NODEJS_VERSION} \
  --build-arg PLUTO_VERSION=${PLUTO_VERSION} \
  -t ${TYPESCRIPT_VERSIONED_IMAGE} \
  -t ${TYPESCRIPT_LATEST_IMAGE} \
  -f docker/Dockerfile.typescript \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Failed to build typescript image"
  exit 1
fi

# Build the python image
docker buildx build \
  --platform ${PLATFORMS} \
  --build-arg PYTHON_VERSION=${PYTHON_VERSION} \
  --build-arg BASE_IMAGE=${TYPESCRIPT_VERSIONED_IMAGE} \
  -t ${PYTHON_VERSIONED_IMAGE} \
  -t ${PYTHON_LATEST_IMAGE} \
  -t ${PLUTO_LATEST_IMAGE} \
  -f docker/Dockerfile.python \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Failed to build python image"
  exit 1
fi