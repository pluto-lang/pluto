# How to Set Up a Kubernetes Development Environment

## Requirements

First, you should consult the [Developer Guide](./dev_guide.md) for instructions on how to set up your initial development environment. Once you have completed that step, you can proceed with the following.

## Prepare the Kubernetes cluster

We suggest using [kind](https://kind.sigs.k8s.io/) to locally create a simulated K8s cluster. You can follow the [installation guide](https://kind.sigs.k8s.io/docs/user/quick-start/#installation) for instructions on how to install it. Additionally, we have provided you with the `scripts/k8s/create-kind-cluster.sh` script to create a kind K8s cluster. This script will utilize Docker to create a local cluster named pluto. In the Docker dashboard, you will find a container named pluto-control-plane.

## Configure the Kubernetes Cluster

We provides the scripts for configuring the K8s cluster. These scripts can be found in the `scripts/k8s` directory. To configure the K8s cluster, you can execute the `install-knative.sh` script. This script primarily performs the following tasks:

### Install Knative Serving

```shell
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.11.1/serving-crds.yaml
kubectl apply -f https://github.com/knative/serving/releases/download/knative-v1.11.1/serving-core.yaml
kubectl apply -f https://github.com/knative/net-kourier/releases/download/knative-v1.11.2/kourier.yaml
kubectl patch configmap/config-network \
  --namespace knative-serving \
  --type merge \
  --patch '{"data":{"ingress-class":"kourier.ingress.networking.knative.dev"}}'
```

### Install Knative Eventing

```shell
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.11.3/eventing-crds.yaml
kubectl apply -f https://github.com/knative/eventing/releases/download/knative-v1.11.3/eventing-core.yaml
```

### Install ResourceStreamSource add-on

In Pluto, we utilize Redis as the event source. Therefore, it is necessary to install the Redis source add-on.

```shell
kubectl apply -f https://github.com/knative-sandbox/eventing-redis/releases/download/knative-v1.11.0/redis-source.yaml
```

### Install NGINX Ingress

At Pluto, we utilize the NGINX ingress controller to combine multiple Knative services. Therefore, it is necessary to install the NGINX ingress controller.

```shell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
```

### Disable tag resolution for the local registry

If you have used "kind" to create a local simulation of a K8s cluster, it is necessary to disable tag resolution for the local registry. Otherwise, the image will not be found during the deployment of the Knative service.

```shell
kubectl patch configmap config-deployment -n knative-serving  --patch '{"data": {"registriesSkippingTagResolving": "localhost:5001"}}'
```

### Disable scale to zero.

Currently, Pluto is unable to route traffic from NGINX Ingress to a Knative service when the service instance count is zero. If you would like to address this issue, please don't hesitate to open an issue or submit a pull request.

```shell
kubectl patch configmap config-autoscaler -n knative-serving  --patch '{"data": {"enable-scale-to-zero": "false"}}'
```
