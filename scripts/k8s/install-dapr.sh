helm repo add dapr https://dapr.github.io/helm-charts/
helm repo update

helm upgrade --install dapr dapr/dapr \
--version=1.11 \
--namespace dapr-system \
--create-namespace \
--wait
