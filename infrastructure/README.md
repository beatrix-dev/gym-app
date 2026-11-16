# Infrastructure (CDK, Java)

> **Do not merge to `main` until "First deploy" below is complete through step 8.** A merge starts the release
> workflows, and they need the CI roles, the GitHub variables, an image in ECR and a running service.

CDK owns the infrastructure only. App code is released by GitHub Actions, outside CDK.

## Stacks

All stacks are in `za.co.beatrix.gym`, built by `GymStacks.create`.

| Stack | Region | Contains | Notes |
| --- | --- | --- | --- |
| `GymCertificate` | us-east-1 | ACM certificate for `app.beatrix.co.za` | CloudFront needs us-east-1 |
| `GymCi` | eu-west-1 | GitHub OIDC provider, the three CI roles | Deployed by hand, never from CI |
| `GymNetwork` | eu-west-1 | VPC: 2 AZs, no NAT, public and isolated subnets | |
| `GymDatabase` | eu-west-1 | Aurora MySQL Serverless v2 | Termination protection |
| `GymAuth` | eu-west-1 | Cognito user pool, app client, hosted domain | Termination protection |
| `GymRegistry` | eu-west-1 | ECR repository `gym-backend` | Immutable tags, keeps 20 images |
| `GymBackend` | eu-west-1 | ECS cluster, Cloud Map, Fargate service | Image tag read from SSM at deploy time |
| `GymApi` | eu-west-1 | HTTP API, VPC Link, Cognito JWT authorizer, routes | |
| `GymFrontend` | eu-west-1 | S3 bucket, CloudFront, SPA rewrite function | Output `CloudFrontDomain` |

## Release types

Each workflow runs when its own folder changes. Pull requests run tests only. A merge to `main` deploys. Every
workflow also has a "Run workflow" button (Actions tab).

| Release | Workflow | Runs on changes to | What it does |
| --- | --- | --- | --- |
| `docker` | `.github/workflows/backend.yml` | `backend/**` | Test, build the image, push to ECR, roll out to ECS, smoke test |
| `app` | `.github/workflows/frontend.yml` | `frontend/**` | Test, build, write `config.json`, upload to S3, clear the CloudFront cache |
| `infra` | `.github/workflows/infrastructure.yml` | `infrastructure/**` | Test, `cdk diff`, `cdk deploy` every stack except `GymCi`, smoke test |

The backend and infra deploys never run at the same time (concurrency group `gym-ecs`), because both can change
the ECS service.

### Adding an API

- **A new endpoint** (for example `POST /api/workouts`): add it in FastAPI. It ships as a backend release.
  API Gateway's `ANY /api/{proxy+}` route already forwards it, and it requires a sign-in.
- **A gateway rule** (a new public route, rate limits, a custom domain, CORS): change `Api.java`. It ships as an
  infra release.

### Infra changes before the code that needs them

The workflows run separately, so one PR that changes `backend/` and `infrastructure/` has no guaranteed order. When
new code needs new infrastructure (for example, a new environment variable):

1. Merge the infra change first. It must work with the code that runs now.
2. Then merge the backend change.

### Rollback

- **Backend:** Actions → Backend → Run workflow on `main`. Enter the `image-tag` (the commit SHA) of an earlier
  release. It must still be in ECR, which keeps the newest 20 images. List them with
  `aws ecr describe-images --repository-name gym-backend --query 'sort_by(imageDetails,&imagePushedAt)[].imageTags'`.
- **Frontend:** revert the commit on `main`. The frontend workflow releases the result.

### How the backend image tag works

The backend workflow writes the tag of the running image to `/gym/backend/image-tag`, after the new version is
healthy. `GymBackend` reads this parameter when CloudFormation deploys. So an infra deploy that changes the task
definition (for example, more memory) keeps the image that is running. CDK never writes this parameter.

## SSM parameters (contract between CDK and the workflows)

| Parameter | Written by | Read by |
| --- | --- | --- |
| `/gym/registry/repository-uri` | `GymRegistry` | backend workflow |
| `/gym/backend/cluster-name` | `GymBackend` | backend workflow |
| `/gym/backend/service-name` | `GymBackend` | backend workflow |
| `/gym/backend/image-tag` | backend workflow | `GymBackend` (at deploy time) |
| `/gym/frontend/bucket-name` | `GymFrontend` | frontend workflow |
| `/gym/frontend/distribution-id` | `GymFrontend` | frontend workflow |
| `/gym/auth/user-pool-id` | `GymAuth` | frontend workflow |
| `/gym/auth/client-id` | `GymAuth` | frontend workflow |
| `/gym/auth/cognito-domain` | `GymAuth` | frontend workflow |

## CI roles

Each role trusts only the `main` branch of `beatrix-dev/gym-app`. The stack that owns a resource grants the role
access to it.

| Role | Used by | GitHub variable |
| --- | --- | --- |
| `gym-ci-infra` | `infrastructure.yml` (assumes the CDK bootstrap roles) | `AWS_INFRA_ROLE_ARN` |
| `gym-ci-backend-release` | `backend.yml` | `AWS_BACKEND_ROLE_ARN` |
| `gym-ci-frontend-release` | `frontend.yml` | `AWS_FRONTEND_ROLE_ARN` |

Set the variables in GitHub: Settings → Secrets and variables → Actions → **Variables** (not Secrets).

## Local tests

Needs JDK 21 and Node. It does not need Docker or a frontend build.

```sh
cd infrastructure
# Only needed if ~/.mavenrc forces another JDK (as on the owner's machine):
MAVEN_SKIP_RC=true JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -B test
```

## First deploy (also the rebuild from the old single `Gym` stack)

Run from `infrastructure/`, on the feature branch, with AWS credentials for the account. Run the commands with
`export AWS_REGION=eu-west-1` set. `<acct>` is the AWS account ID.

### 1. Rebuild only: delete the old `Gym` stack

`Gym` is no longer in the CDK app, so delete it with CloudFormation:

```sh
aws cloudformation delete-stack --stack-name Gym
aws cloudformation wait stack-delete-complete --stack-name Gym
```

### 2. Rebuild only: clean up what it leaves behind

The old user pool is retained, and it still holds the `gym-beatrix` domain prefix that `GymAuth` needs:

```sh
aws cognito-idp list-user-pools --max-results 20                      # find the old pool ID
aws cognito-idp delete-user-pool-domain --domain gym-beatrix --user-pool-id <old pool id>
aws cognito-idp delete-user-pool --user-pool-id <old pool id>
```

Aurora left a final snapshot:

```sh
aws rds describe-db-cluster-snapshots --snapshot-type manual \
  --query 'DBClusterSnapshots[].DBClusterSnapshotIdentifier'
aws rds delete-db-cluster-snapshot --db-cluster-snapshot-identifier <snapshot id>
```

The old `GymCi` stack has the old single deploy role. Step 4 replaces it.

### 3. New account only: bootstrap CDK and the certificate

```sh
npx aws-cdk@2 bootstrap aws://<acct>/eu-west-1 aws://<acct>/us-east-1
npx aws-cdk@2 deploy GymCertificate
```

While the certificate deploy waits, add its DNS validation CNAME at the registrar (xneelo/Afrihost). Get it with
`aws acm describe-certificate --region us-east-1 --certificate-arn <arn>
--query 'Certificate.DomainValidationOptions[0].ResourceRecord'`.

### 4. Deploy the CI roles and set the GitHub variables

```sh
npx aws-cdk@2 deploy GymCi
```

Copy the three outputs (`InfraRoleArn`, `BackendReleaseRoleArn`, `FrontendReleaseRoleArn`) into the GitHub
variables in "CI roles" above. Delete the old `AWS_DEPLOY_ROLE_ARN` variable.

Gotcha: an AWS account allows only one GitHub OIDC provider. If an unused one exists, delete it (IAM → Identity
providers) or adapt `CiStack` to import it.

### 5. Deploy the registry and push the first image

```sh
npx aws-cdk@2 deploy GymRegistry

REPO=$(aws ssm get-parameter --name /gym/registry/repository-uri --query Parameter.Value --output text)
TAG=$(git rev-parse HEAD)
aws ecr get-login-password | docker login --username AWS --password-stdin "${REPO%%/*}"
docker buildx build --platform linux/amd64 -t "$REPO:$TAG" --push ../backend
aws ssm put-parameter --name /gym/backend/image-tag --type String --value "$TAG" --overwrite
```

### 6. Deploy the rest

```sh
npx aws-cdk@2 deploy GymCertificate GymNetwork GymDatabase GymAuth GymBackend GymApi GymFrontend
```

`GymCertificate` is deployed again because its cross-region export now names `GymFrontend`. The certificate does
not change.

### 7. Point DNS at CloudFront

Set `app CNAME <CloudFrontDomain>` at the registrar, using the `GymFrontend` output. **A rebuild creates a new
distribution, so the value changes.** Wait until `dig app.beatrix.co.za` shows it.

```sh
aws cloudformation describe-stacks --stack-name GymFrontend \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDomain'].OutputValue" --output text
```

### 8. Upload the frontend

These are the same steps `frontend.yml` runs:

```sh
cd ../frontend && npm ci && npm run build
get() { aws ssm get-parameter --name "$1" --query Parameter.Value --output text; }
jq -n --arg pool "$(get /gym/auth/user-pool-id)" --arg client "$(get /gym/auth/client-id)" \
  --arg domain "$(get /gym/auth/cognito-domain)" \
  '{authority: ("https://cognito-idp.eu-west-1.amazonaws.com/" + $pool),
    clientId: $client, cognitoDomain: $domain, apiBaseUrl: "/api"}' > dist/config.json
BUCKET=$(get /gym/frontend/bucket-name)
aws s3 sync dist/assets "s3://$BUCKET/assets" --cache-control "public,max-age=31536000,immutable"
aws s3 sync dist "s3://$BUCKET" --exclude "assets/*" --delete --cache-control "no-cache"
aws s3 sync dist/assets "s3://$BUCKET/assets" --delete
aws cloudfront create-invalidation --distribution-id "$(get /gym/frontend/distribution-id)" --paths "/*"
```

### 9. Create the user accounts

Self sign-up is off, so create each user yourself. Cognito emails them a temporary password:

```sh
aws cognito-idp admin-create-user \
  --user-pool-id "$(aws ssm get-parameter --name /gym/auth/user-pool-id --query Parameter.Value --output text)" \
  --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true \
  --desired-delivery-mediums EMAIL
```

To remove someone, use `aws cognito-idp admin-delete-user`, or disable them in the Cognito console.

### 10. Verify, then merge

- `https://app.beatrix.co.za/meals` loads the SPA.
- `https://app.beatrix.co.za/api/nope` returns a JSON 401, not the SPA.
- "Sign in" goes to the Cognito login page, and signing in lands on `/log`.
- `../.github/scripts/smoke-test.sh` prints `Healthy`.

Then merge the PR. The merge runs all three workflows once:

- the infra deploy finds no changes
- the backend release ships the same commit again
- the frontend release uploads the same files again

## Local development against the deployed Cognito

`localhost:5173/auth/callback` is already an allowed callback URL. Get the IDs from `/gym/auth/user-pool-id` and
`/gym/auth/client-id`.

`frontend/public/config.json`:

```json
{
  "authority": "https://cognito-idp.eu-west-1.amazonaws.com/<user pool id>",
  "clientId": "<client id>",
  "cognitoDomain": "gym-beatrix.auth.eu-west-1.amazoncognito.com",
  "apiBaseUrl": "http://localhost:8100/api"
}
```

`backend/.env` (copy from `.env.example`):

```
COGNITO_USER_POOL_ID=<user pool id>
COGNITO_CLIENT_ID=<client id>
```

The frontend workflow writes the production `config.json`, so do not commit real values in the local file.

## Gotchas

- `GymDatabase` and `GymAuth` have termination protection. To delete one on purpose, turn it off first:
  `aws cloudformation update-termination-protection --no-enable-termination-protection --stack-name <stack>`.
- The user pool is retained when `GymAuth` is deleted, and it keeps the `gym-beatrix` domain prefix. Delete the
  domain and the pool by hand (step 2) before you deploy `GymAuth` again.
- Cognito's built-in email sender allows only a few emails per day. That is enough for a handful of users.
- The ECR repository is retained when `GymRegistry` is deleted. Delete it by hand before you deploy the stack
  again, because the name `gym-backend` is fixed.
