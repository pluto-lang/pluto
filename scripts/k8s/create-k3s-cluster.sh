#!/bin/bash

# Need to install k3d beforehand
# curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

CLUSTER_NAME=${1:-"pluto-cluster"}

k3d cluster create $CLUSTER_NAME --registry-create ${CLUSTER_NAME}-registry:0.0.0.0:5432

cat <<EOF >>/etc/hosts
127.0.0.1 ${CLUSTER_NAME}-registry
EOF

DIR_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "DIR_PATH: $DIR_PATH"
echo "PWD: $(pwd)"

bash $DIR_PATH/install-knative.sh ${CLUSTER_NAME}-registry:5432
