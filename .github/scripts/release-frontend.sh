#!/usr/bin/env bash
# Uploads a frontend build to S3 and clears the CloudFront cache. Used by frontend.yml and by the first deploy in
# infrastructure/README.md. Needs AWS credentials for eu-west-1 that can read /gym/* and write the frontend bucket.
#
# Usage: release-frontend.sh <dist-dir>
set -euo pipefail

dist=${1:?usage: release-frontend.sh <dist-dir>}
# Old asset files are kept this long, so a tab still running the previous release can load its lazy-loaded pages.
keep_old_assets_days=7

get() { aws ssm get-parameter --name "$1" --query Parameter.Value --output text; }
bucket=$(get /gym/frontend/bucket-name)
distribution=$(get /gym/frontend/distribution-id)

# Replaces the local-dev config.json that Vite copies from public/.
jq -n \
  --arg pool "$(get /gym/auth/user-pool-id)" \
  --arg client "$(get /gym/auth/client-id)" \
  --arg domain "$(get /gym/auth/cognito-domain)" \
  '{authority: ("https://cognito-idp.eu-west-1.amazonaws.com/" + $pool),
    clientId: $client, cognitoDomain: $domain, apiBaseUrl: "/api"}' \
  > "$dist/config.json"

# New assets first, then the files that point at them, so every index.html that can be served finds its assets.
aws s3 sync "$dist/assets" "s3://$bucket/assets" --cache-control "public,max-age=31536000,immutable"
aws s3 sync "$dist" "s3://$bucket" --exclude "assets/*" --delete --cache-control "no-cache"

aws cloudfront create-invalidation --distribution-id "$distribution" --paths "/*" > /dev/null

# Delete asset files that this build does not use and that were uploaded more than keep_old_assets_days ago.
cutoff=$(python3 -c "import datetime as d; print((d.datetime.now(d.timezone.utc) - d.timedelta(days=$keep_old_assets_days)).strftime('%Y-%m-%dT%H:%M:%S'))")
current=$(cd "$dist" && find assets -type f | sort)
old=$(aws s3api list-objects-v2 --bucket "$bucket" --prefix assets/ \
  --query "Contents[?LastModified<'$cutoff'].Key" --output text | tr '\t' '\n' | grep -v '^None$' | sort || true)
comm -23 <(echo "$old") <(echo "$current") | while read -r key; do
  if [ -n "$key" ]; then aws s3 rm "s3://$bucket/$key"; fi
done

echo "Released $dist to s3://$bucket"
