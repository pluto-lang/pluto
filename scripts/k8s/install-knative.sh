#!/bin/bash

REGISTRY_URL=${1:-"pluto-cluster-registry:5432"}

# Install Knative Serving
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.11.1/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.11.1/serving-core.yaml
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.11.2/kourier.yaml
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'

# Install Knative Eventing
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.11.3/eventing-crds.yaml
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.11.3/eventing-core.yaml

# Install ResourceStreamSource add-on
kubectl apply -f https://github.com/knative-sandbox/eventing-redis/releases/download/knative-v1.11.0/redis-source.yaml

# Install Ingress NGINX
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# Disable tag resolution for the local registry
kubectl patch configmap config-deployment -n knative-serving --patch '{"data": {"registriesSkippingTagResolving": "'$REGISTRY_URL'"}}'

# Disable scale to zero.
# TODO: improve the integration method of the Knative service and enable zero scaling.
kubectl patch configmap config-autoscaler -n knative-serving --patch '{"data": {"enable-scale-to-zero": "false"}}'
