#!/bin/sh
# From: https://kind.sigs.k8s.io/docs/user/local-registry/

set -o errexit

cluster_name='pluto'

# 1. Create registry container unless it already exists
reg_name='kind-registry'
reg_port='5001'
if [ "$(docker inspect -f '{{.State.Running}}' "${reg_name}" 2>/dev/null || true)" != 'true' ]; then
  docker run \
    -d --restart=always -p "127.0.0.1:${reg_port}:5000" --network bridge --name "${reg_name}" \
    registry:2
fi

# 2. Create kind cluster with containerd registry config dir enabled
# TODO: kind will eventually enable this by default and this patch will
# be unnecessary.
#
# See:
# https://github.com/kubernetes-sigs/kind/issues/2875
# https://github.com/containerd/containerd/blob/main/docs/cri/config.md#registry-configuration
# See: https://github.com/containerd/containerd/blob/main/docs/hosts.md
cat <<EOF | kind create cluster   -n ${cluster_name} --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry]
    config_path = "/etc/containerd/certs.d"
EOF

# 3. Add the registry config to the nodes
#
# This is necessary because localhost resolves to loopback addresses that are
# network-namespace local.
# In other words: localhost in the container is not localhost on the host.
#
# We want a consistent name that works from both ends, so we tell containerd to
# alias localhost:${reg_port} to the registry container when pulling images
REGISTRY_DIR="/etc/containerd/certs.d/localhost:${reg_port}"
for node in $(kind get nodes -n ${cluster_name}); do
  docker exec "${node}" mkdir -p "${REGISTRY_DIR}"
  cat <<EOF | docker exec -i "${node}" cp /dev/stdin "${REGISTRY_DIR}/hosts.toml"
[host."http://${reg_name}:5000"]
EOF
done

# 4. Connect the registry to the cluster network if not already connected
# This allows kind to bootstrap the network but ensures they're on the same network
if [ "$(docker inspect -f='{{json .NetworkSettings.Networks.kind}}' "${reg_name}")" = 'null' ]; then
  docker network connect "kind" "${reg_name}"
fi

# 5. Document the local registry
# https://github.com/kubernetes/enhancements/tree/master/keps/sig-cluster-lifecycle/generic/1755-communicating-a-local-registry
kubectl cluster-info --context kind-${cluster_name}
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: local-registry-hosting
  namespace: kube-public
data:
  localRegistryHosting.v1: |
    host: "localhost:${reg_port}"
    help: "https://kind.sigs.k8s.io/docs/user/local-registry/"
EOF

# Using The Registry
# https://kind.sigs.k8s.io/docs/user/local-registry/#using-the-registry
#
# The registry can be used like this.
#   1. First we’ll pull an image docker pull
#      `gcr.io/google-samples/hello-app:1.0`
#   2. Then we’ll tag the image to use the local registry `docker tag
#      gcr.io/google-samples/hello-app:1.0 localhost:5001/hello-app:1.0`
#   3. Then we’ll push it to the registry docker push
#      `localhost:5001/hello-app:1.0`
#   4. And now we can use the image `kubectl create deployment hello-server
#      --image=localhost:5001/hello-app:1.0`
#
# If you build your own image and tag it like `localhost:5001/image:foo` and
# then use it in kubernetes as `localhost:5001/image:foo`. And use it from
# inside of your cluster application as `kind-registry:5000`.
