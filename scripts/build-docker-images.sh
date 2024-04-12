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


# /==================================
# The utility functions

# The `convert_to_digest` function converts the image tag to a digest format.
# For example, `plutolang/pluto:0.4.7-typescript-nodejs20.x` will be converted to
# `plutolang/pluto@sha256:...`.
function convert_to_digest() {
  local image_tag=$1
  local manifest_details=$(docker manifest inspect "$image_tag")
  local first_digest=$(echo "$manifest_details" | jq -r '.manifests[0].digest')
  local image_name="${image_tag%%:*}"
  local image_digest="${image_name}@${first_digest}"
  echo "$image_digest"
}

# The `create_docker_manifest` function creates a manifest for the given images.
# It also pushes the manifest to the Docker registry.
function create_docker_manifest {
  local manifest=$1
  shift
  local images=("$@")
  local amend=""

  if docker manifest inspect "$manifest" > /dev/null 2>&1; then
    amend="--amend"
  fi

  for i in "${!images[@]}"; do
    if docker manifest inspect "${images[$i]}" > /dev/null 2>&1; then
      images[$i]=$(convert_to_digest "${images[$i]}")
    fi
  done

  printf "Creating manifest %s with images %s\n" "$manifest" "${images[*]}"
  docker manifest create $amend $manifest ${images[*]}
  if [[ $? -ne 0 ]]; then
    printf "Failed to create manifest %s\n" "$manifest"
    return 1
  fi

  printf "Pushing manifest %s\n" "$manifest"
  docker manifest push $manifest
  if [[ $? -ne 0 ]]; then
    printf "Failed to push manifest %s\n" "$manifest"
    return 1
  fi
  return 0
}
# \==================================

# Prepare the dind image
DIND_IMAGE_NAME=plutolang/dind:latest

# Check if the dind image exists, if not, build it
if ! docker manifest inspect $DIND_IMAGE_NAME > /dev/null 2>&1; then
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

# Start the build process for the Pluto images
echo "Building images for Pluto version ${PLUTO_VERSION}, Node.js version ${NODEJS_VERSION}, and Python version ${PYTHON_VERSION}"

# Set the image tags
IMAGE_REPO=plutolang/pluto

TYPESCRIPT_VERSIONED_AMD64_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-typescript-nodejs${NODEJS_VERSION}-amd64
TYPESCRIPT_VERSIONED_ARM64_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-typescript-nodejs${NODEJS_VERSION}-arm64
TYPESCRIPT_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-typescript-nodejs${NODEJS_VERSION}
TYPESCRIPT_LATEST_IMAGE=${IMAGE_REPO}:latest-typescript

PYTHON_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}-python-${PYTHON_VERSION}
PYTHON_LATEST_IMAGE=${IMAGE_REPO}:latest-python

PLUTO_VERSIONED_IMAGE=${IMAGE_REPO}:${PLUTO_VERSION}
PLUTO_LATEST_IMAGE=${IMAGE_REPO}:latest

echo "Building images with the following tags:"
echo "  TypeScript AMD64: ${TYPESCRIPT_VERSIONED_AMD64_IMAGE}"
echo "  TypeScript ARM64: ${TYPESCRIPT_VERSIONED_ARM64_IMAGE}"
echo "  TypeScript: ${TYPESCRIPT_VERSIONED_IMAGE}"
echo "  TypeScript Latest: ${TYPESCRIPT_LATEST_IMAGE}"
echo "  Python: ${PYTHON_VERSIONED_IMAGE}"
echo "  Python Latest: ${PYTHON_LATEST_IMAGE}"
echo "  Pluto: ${PLUTO_VERSIONED_IMAGE}"
echo "  Pluto Latest: ${PLUTO_LATEST_IMAGE}"


# /==================================
# The image hierarchy is as follows:
# ubuntu:22.04                          DIND_IMAGE_NAME
#   |                                     |
#   v                                     v
# TYPESCRIPT_VERSIONED_AMD64_IMAGE  TYPESCRIPT_VERSIONED_ARM64_IMAGE
#              \                       /
#               v                     v 
#              TYPESCRIPT_VERSIONED_IMAGE  ——>  TYPESCRIPT_LATEST_IMAGE
#                |
#                v
# PYTHON_VERSIONED_IMAGE == PYTHON_LATEST_IMAGE == PLUTO_VERSIONED_IMAGE == PLUTO_LATEST_IMAGE
# \==================================


# /==================================
# Build the TypeScript images

# Since Pluto requires Docker for bundling business code on the ARM platform, we'll need to create
# the image using the dind image for ARM64. However, building the image based on the dind image for
# AMD64 isn't necessary. Thus, we'll need to separately build images for the ARM64 and AMD64
# platforms.

# Build for AMD64 based on the ubuntu image
docker buildx build \
  --platform linux/amd64 \
  --build-arg PLUTO_VERSION=${PLUTO_VERSION} \
  --build-arg NODEJS_VERSION=${NODEJS_VERSION} \
  --build-arg BASE_IMAGE=ubuntu:22.04 \
  -t ${TYPESCRIPT_VERSIONED_AMD64_IMAGE} \
  -f docker/Dockerfile.typescript \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Failed to build typescript image for AMD64"
  exit 1
fi

# Build for ARM64 based on the dind image
docker buildx build \
  --platform linux/arm64 \
  --build-arg PLUTO_VERSION=${PLUTO_VERSION} \
  --build-arg NODEJS_VERSION=${NODEJS_VERSION} \
  --build-arg BASE_IMAGE=${DIND_IMAGE_NAME} \
  -t ${TYPESCRIPT_VERSIONED_ARM64_IMAGE} \
  -f docker/Dockerfile.typescript \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Failed to build typescript image for ARM64"
  exit 1
fi

# Build the TypeScript versioned image
export DOCKER_CLI_EXPERIMENTAL=enabled

create_docker_manifest ${TYPESCRIPT_VERSIONED_IMAGE} \
  ${TYPESCRIPT_VERSIONED_AMD64_IMAGE} \
  ${TYPESCRIPT_VERSIONED_ARM64_IMAGE}

if [ $? -ne 0 ]; then
  echo "Failed to create manifest for ${TYPESCRIPT_VERSIONED_IMAGE}"
  exit 1
fi

# Build the TypeScript latest image

create_docker_manifest $TYPESCRIPT_LATEST_IMAGE \
  ${TYPESCRIPT_VERSIONED_AMD64_IMAGE} \
  ${TYPESCRIPT_VERSIONED_ARM64_IMAGE}

if [ $? -ne 0 ]; then
  echo "Failed to create manifest for ${TYPESCRIPT_LATEST_IMAGE}"
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