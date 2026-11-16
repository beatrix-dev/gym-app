#!/usr/bin/env bash
# Releases a backend image to ECS. The backend release owns the task definition and the service
# (backend/deploy/*.json); CDK (GymBackend) owns the environment they run in and publishes it under /gym/.
# Creates the service on the first release and updates it after that. Fails if the circuit breaker rolls back.
# Used by .github/workflows/backend.yml; also runs locally with AWS credentials for eu-west-1.
#
# Usage: release-backend.sh <image-uri>    e.g. 403494440507.dkr.ecr.eu-west-1.amazonaws.com/gym-backend:<sha>
set -euo pipefail

image=${1:?usage: release-backend.sh <image-uri>}
deploy_dir="$(cd "$(dirname "$0")/../../backend/deploy" && pwd)"

get() { aws ssm get-parameter --name "$1" --query Parameter.Value --output text; }
cluster=$(get /gym/backend/cluster-name)
service=$(jq -r .serviceName "$deploy_dir/service.json")
secret=$(get /gym/backend/db-secret-arn)

# Fill in the values that come from the environment; everything else is in task-definition.json.
jq \
  --arg image "$image" \
  --arg task_role "$(get /gym/backend/task-role-arn)" \
  --arg execution_role "$(get /gym/backend/execution-role-arn)" \
  --arg log_group "$(get /gym/backend/log-group-name)" \
  --arg pool "$(get /gym/auth/user-pool-id)" \
  --arg client "$(get /gym/auth/client-id)" \
  --arg secret "$secret" \
  '.taskRoleArn = $task_role
   | .executionRoleArn = $execution_role
   | .containerDefinitions[0].image = $image
   | .containerDefinitions[0].logConfiguration.options["awslogs-group"] = $log_group
   | .containerDefinitions[0].environment += [
       {name: "COGNITO_USER_POOL_ID", value: $pool},
       {name: "COGNITO_CLIENT_ID", value: $client}]
   | .containerDefinitions[0].secrets = [
       {name: "DB_HOST", valueFrom: ($secret + ":host::")},
       {name: "DB_PORT", valueFrom: ($secret + ":port::")},
       {name: "DB_USER", valueFrom: ($secret + ":username::")},
       {name: "DB_PASSWORD", valueFrom: ($secret + ":password::")}]' \
  "$deploy_dir/task-definition.json" > task-definition.rendered.json

task_definition=$(aws ecs register-task-definition --cli-input-json file://task-definition.rendered.json \
  --query taskDefinition.taskDefinitionArn --output text)
rm -f task-definition.rendered.json
echo "Registered $task_definition"

# Settings applied on every release, so service.json stays the single source of truth for the service.
jq \
  --arg cluster "$cluster" \
  --arg task_definition "$task_definition" \
  --arg subnets "$(get /gym/backend/subnet-ids)" \
  --arg security_group "$(get /gym/backend/security-group-id)" \
  --arg registry "$(get /gym/backend/cloud-map-service-arn)" \
  '. + {
     cluster: $cluster,
     taskDefinition: $task_definition,
     networkConfiguration: {awsvpcConfiguration: {
       subnets: ($subnets | split(",")), securityGroups: [$security_group], assignPublicIp: "ENABLED"}},
     serviceRegistries: [{registryArn: $registry, containerName: "backend", containerPort: 8100}]}' \
  "$deploy_dir/service.json" > service.rendered.json

status=$(aws ecs describe-services --cluster "$cluster" --services "$service" \
  --query 'services[0].status' --output text 2>/dev/null || true)
if [ "$status" = "ACTIVE" ]; then
  echo "Updating service $service"
  jq '. + {service: .serviceName} | del(.serviceName, .launchType)' service.rendered.json > service.update.json
  aws ecs update-service --cli-input-json file://service.update.json > /dev/null
  rm -f service.update.json
else
  echo "Creating service $service"
  jq '. + {launchType: "FARGATE"}' service.rendered.json > service.create.json
  aws ecs create-service --cli-input-json file://service.create.json > /dev/null
  rm -f service.create.json
fi
rm -f service.rendered.json

echo "Waiting for the service to become stable"
aws ecs wait services-stable --cluster "$cluster" --services "$service"

# After a circuit-breaker rollback the service is stable on the OLD revision, so "stable" alone is not success.
primary=$(aws ecs describe-services --cluster "$cluster" --services "$service" \
  --query "services[0].deployments[?status=='PRIMARY'] | [0]")
running=$(jq -r .taskDefinition <<< "$primary")
rollout=$(jq -r .rolloutState <<< "$primary")
if [ "$running" != "$task_definition" ] || [ "$rollout" != "COMPLETED" ]; then
  echo "Release rolled back by the circuit breaker (running $running, state $rollout)" >&2
  exit 1
fi
echo "Released $image"
