#!/usr/bin/env bash
set -euo pipefail

# Docker Desktop kind nodes cache images independently of docker build.
task_account_root=$(cd "$(dirname "$0")/.." && pwd)
task_compose="$task_account_root/docker/docker-compose.yml"

docker --context desktop-linux compose -f "$task_compose" build
kubectl --context docker-desktop wait --for=condition=Ready nodes --all --timeout=180s

while IFS=' ' read -r task_node task_arch; do
  [ -n "$task_node" ] || continue
  docker --context desktop-linux inspect "$task_node" --format '{{.Id}}'
  docker --context desktop-linux image save --platform "linux/$task_arch" \
    oni-lab4-account:lab4 oni-lab4-auth:lab4 oni-lab4-transaction:lab4 |
    docker --context desktop-linux exec -i "$task_node" \
      ctr --namespace k8s.io images import --platform "linux/$task_arch" -
done < <(kubectl --context docker-desktop get nodes \
  -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.nodeInfo.architecture}{"\n"}{end}')

kubectl --context docker-desktop apply -f "$task_account_root/k8s/"
kubectl --context docker-desktop rollout restart deployment/account deployment/auth deployment/transaction
for task_service in account auth transaction; do
  kubectl --context docker-desktop rollout status "deployment/$task_service" --timeout=180s
done
kubectl --context docker-desktop get pods,services,pvc
