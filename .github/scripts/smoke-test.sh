#!/usr/bin/env bash
# Waits until the backend reports a working database connection through the public URL.
set -euo pipefail

url="https://app.beatrix.co.za/api/health/db"
for i in $(seq 1 12); do
  if curl -sf "$url" | grep -q '"db":"connected"'; then
    echo "Healthy"
    exit 0
  fi
  echo "Attempt $i failed; retrying in 5s"
  sleep 5
done
echo "Smoke test failed" >&2
exit 1
