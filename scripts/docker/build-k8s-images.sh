#!/bin/bash

# Set default values
PLUTO_VERSION=0.4.7
NODEJS_VERSION=20.x
PYTHON_VERSION=3.10
KUBECTL_VERSION=v1.29.4
K3D_VERSION=v5.6.3

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

# Prepare the base image
DIND_IMAGE_NAME=plutolang/dind:latest
K3D_VERSIONED_IMAGE_NAME=plutolang/k8s:k3d${K3D_VERSION}-kubectl${KUBECTL_VERSION}
K3D_IMAGE_NAME=plutolang/k8s:k3d-latest

# Check if the dind image exists, if not, build it
if ! docker manifest inspect $K3D_IMAGE_NAME >/dev/null 2>&1; then
  echo "k3d image does not exist, building it..."
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --build-arg BASE_IMAGE=${DIND_IMAGE_NAME} \
    --build-arg K3D_VERSION=${K3D_VERSION} \
    --build-arg KUBECTL_VERSION=${KUBECTL_VERSION} \
    --build-arg CREATE_CLUSTER_SCRIPT_PATH=scripts/k8s/create-k3s-cluster.sh \
    --build-arg INSTALL_KNATIVE_SCRIPT_PATH=scripts/k8s/install-knative.sh \
    -t ${K3D_VERSIONED_IMAGE_NAME} \
    -t ${K3D_IMAGE_NAME} \
    -f docker/Dockerfile.k8s.k3d \
    --push \
    .

  if [ $? -ne 0 ]; then
    echo "Failed to build k3d image"
    exit 1
  fi
fi

# Start the build process for the Pluto images
echo "Building images for Pluto version ${PLUTO_VERSION}, Node.js version ${NODEJS_VERSION}, and Python version ${PYTHON_VERSION}"

# Set the image tags
IMAGE_REPO=plutolang/pluto

TYPESCRIPT_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-typescript-nodejs${NODEJS_VERSION}-k3d
TYPESCRIPT_LATEST_IMAGE=${IMAGE_REPO}:latest-typescript-k3d

PYTHON_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-python-${PYTHON_VERSION}-k3d
PYTHON_LATEST_IMAGE=${IMAGE_REPO}:latest-python-k3d

PLUTO_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-k3d
PLUTO_LATEST_IMAGE=${IMAGE_REPO}:latest-k3d

echo "Building images with the following tags:"
echo "  TypeScript: ${TYPESCRIPT_VERSIONED_IMAGE}"
echo "  TypeScript Latest: ${TYPESCRIPT_LATEST_IMAGE}"
echo "  Python: ${PYTHON_VERSIONED_IMAGE}"
echo "  Python Latest: ${PYTHON_LATEST_IMAGE}"
echo "  Pluto: ${PLUTO_VERSIONED_IMAGE}"
echo "  Pluto Latest: ${PLUTO_LATEST_IMAGE}"

# /==================================
# The image hierarchy is as follows:
# DIND_IMAGE_NAME
#   |
#   v
# K3D_IMAGE_NAME
#   |
#   v
# TYPESCRIPT_VERSIONED_IMAGE  ——>  TYPESCRIPT_LATEST_IMAGE
#                |
#                v
# PYTHON_VERSIONED_IMAGE == PYTHON_LATEST_IMAGE == PLUTO_VERSIONED_IMAGE == PLUTO_LATEST_IMAGE
# \==================================

# /==================================
# Build the TypeScript images

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg PLUTO_VERSION=${PLUTO_VERSION} \
  --build-arg NODEJS_VERSION=${NODEJS_VERSION} \
  --build-arg BASE_IMAGE=${K3D_IMAGE_NAME} \
  -t ${TYPESCRIPT_VERSIONED_IMAGE} \
  -t ${TYPESCRIPT_LATEST_IMAGE} \
  -f docker/Dockerfile.typescript \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Failed to build typescript image"
  exit 1
fi

# /==================================
# Build the Python images

# Build the image based on the TypeScript image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg PYTHON_VERSION=${PYTHON_VERSION} \
  --build-arg BASE_IMAGE=${TYPESCRIPT_VERSIONED_IMAGE} \
  -t ${PYTHON_VERSIONED_IMAGE} \
  -t ${PYTHON_LATEST_IMAGE} \
  -t ${PLUTO_VERSIONED_IMAGE} \
  -t ${PLUTO_LATEST_IMAGE} \
  -f docker/Dockerfile.python \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Failed to build python image"
  exit 1
fi

echo "Successfully built images for Pluto version ${PLUTO_VERSION}, Node.js version ${NODEJS_VERSION}, and Python version ${PYTHON_VERSION}"

echo "Images are available at:"
echo "  TypeScript: ${TYPESCRIPT_VERSIONED_IMAGE}"
echo "  TypeScript Latest: ${TYPESCRIPT_LATEST_IMAGE}"
echo "  Python: ${PYTHON_VERSIONED_IMAGE}"
echo "  Python Latest: ${PYTHON_LATEST_IMAGE}"
echo "  Pluto: ${PLUTO_VERSIONED_IMAGE}"
echo "  Pluto Latest: ${PLUTO_LATEST_IMAGE}"
