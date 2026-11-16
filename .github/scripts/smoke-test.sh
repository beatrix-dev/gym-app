#!/usr/bin/env bash
# Waits until the backend reports a working database connection. Calls API Gateway directly (URL from SSM), so it
# works before the app domain's DNS points at CloudFront. Needs AWS credentials that can read /gym/*.
set -euo pipefail

url="$(aws ssm get-parameter --name /gym/api/url --query Parameter.Value --output text)/api/health/db"
# Two minutes: a scaled-to-zero Aurora takes a while to resume on the first request.
for i in $(seq 1 24); do
  if curl -sf "$url" | grep -q '"db":"connected"'; then
    echo "Healthy: $url"
    exit 0
  fi
  echo "Attempt $i failed; retrying in 5s"
  sleep 5
done
echo "Smoke test failed: $url" >&2
exit 1
