# Infrastructure (CDK, Java)

AWS account `403494440507`, region `eu-west-1`. The certificate is in `us-east-1`, because CloudFront needs it
there.

## Who owns what

Each AWS resource has exactly one owner, so nothing drifts.

| Owner | Owns | Changes ship by |
| --- | --- | --- |
| **CDK** (`infrastructure/`) | Every AWS resource the app runs on (table below). It never builds or deploys app code. | `infrastructure.yml` |
| **Backend release** (`backend/`) | The ECS **task definition** and **service**: `backend/deploy/task-definition.json` and `service.json` | `backend.yml` |
| **Frontend release** (`frontend/`) | The files in the S3 bucket, including `config.json` | `frontend.yml` |

CDK always deploys first, and it needs no image. The releases only use what CDK created. They find it through SSM
parameters under `/gym/`.

## Stacks

| Stack | Contains |
| --- | --- |
| `GymCertificate` (us-east-1) | ACM certificate for `app.beatrix.co.za` |
| `GymCi` | The three CI roles. It uses the account's existing GitHub OIDC provider. **Deploy it by hand** (`npx aws-cdk@2 deploy GymCi`). CI never deploys it. |
| `GymNetwork` | VPC: 2 AZs, no NAT |
| `GymDatabase` | Aurora MySQL Serverless v2 (scales to zero). Termination protection. |
| `GymAuth` | Cognito user pool and app client. Termination protection. |
| `GymRegistry` | ECR repository `gym-backend`: immutable tags, keeps the newest 20 images |
| `GymBackend` | The backend's environment: ECS cluster, Cloud Map service, security group, task and execution roles, log group `/gym/backend`. **No ECS service or task definition.** |
| `GymApi` | HTTP API with Cognito JWT authorizer, VPC Link to the Cloud Map service |
| `GymFrontend` | S3 bucket and CloudFront. Output `CloudFrontDomain`. |

## Releases

Each workflow runs when its own folder changes on `main`. Pull requests run tests only. Every workflow also has a
**Run workflow** button in the Actions tab.

| Workflow | Runs on changes to | What it does |
| --- | --- | --- |
| `infrastructure.yml` | `infrastructure/**` | Tests, `cdk diff`, `cdk deploy` of every stack except `GymCi` |
| `backend.yml` | `backend/**` | Tests, builds and pushes the image (tag = commit SHA), then runs `.github/scripts/release-backend.sh`, then the smoke test |
| `frontend.yml` | `frontend/**` | Tests and builds once, then runs `.github/scripts/release-frontend.sh` |

- **`release-backend.sh <image-uri>`** registers the task definition from `backend/deploy/` and creates the ECS
  service on the first release, or updates it after that. It waits for the rollout to finish, and fails if the
  circuit breaker rolls the release back.
- **`release-frontend.sh <dist-dir>`** writes `config.json`, uploads the files, keeps old asset files for 7 days so
  open tabs keep working, and clears the CloudFront cache.

Both scripts also run from a laptop with AWS credentials.

To skip all deploys for one merge, put `[skip ci]` in the merge message.

### Common changes

| You want to… | Change | Ships with |
| --- | --- | --- |
| Add an API endpoint | FastAPI code. `ANY /api/{proxy+}` already forwards it, and it requires a sign-in. | backend |
| Change CPU, memory, env vars or the health check | `backend/deploy/task-definition.json` | backend |
| Change the task count or rollout settings | `backend/deploy/service.json` | backend |
| Add a public route, rate limits, a custom domain or CORS | `Api.java` | infra |
| Anything else in AWS | the matching stack in `infrastructure/src` | infra |

If new backend code needs new infrastructure (for example, a new secret), merge the infra change first.

### Rollback

- **Backend:** Actions → Backend → Run workflow, with `image-tag` set to the commit SHA of an earlier release.
  ECR keeps the newest 20 images.
- **Frontend:** revert the commit on `main`.

## SSM parameters (`/gym/`)

All are written by CDK and read by the release scripts and workflows.

| Parameter | Written by |
| --- | --- |
| `registry/repository-uri` | `GymRegistry` |
| `backend/cluster-name`, `cloud-map-service-arn`, `security-group-id`, `subnet-ids`, `task-role-arn`, `execution-role-arn`, `log-group-name`, `db-secret-arn` | `GymBackend` |
| `api/url` | `GymApi` |
| `frontend/bucket-name`, `distribution-id`, `domain-name` | `GymFrontend` |
| `auth/user-pool-id`, `client-id`, `cognito-domain` | `GymAuth` |

## CI roles

Each role trusts only `repo:beatrix-dev@257955182/gym-app@1314188794:ref:refs/heads/main`. This is GitHub's
immutable subject format, which this repo uses.

| Role | GitHub variable |
| --- | --- |
| `gym-ci-infra` | `AWS_INFRA_ROLE_ARN` |
| `gym-ci-backend-release` | `AWS_BACKEND_ROLE_ARN` |
| `gym-ci-frontend-release` | `AWS_FRONTEND_ROLE_ARN` |

These are repo **variables**, not secrets. The stack that owns a resource grants the role access to it.

## Local commands

You need JDK 21 and Node, but not Docker or a frontend build. `cdk.json` picks JDK 21 itself, even if `~/.mavenrc`
pins another version.

```sh
cd infrastructure
MAVEN_SKIP_RC=true JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -B test   # tests
npx aws-cdk@2 diff                                                          # compare code with AWS
```

## Deploying into an empty account

1. Bootstrap CDK in both regions: `npx aws-cdk@2 bootstrap aws://<acct>/eu-west-1 aws://<acct>/us-east-1`.
2. The GitHub OIDC provider must exist (an account has one, shared by all repos). If it doesn't, create it:
   `aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com`.
3. Run `npx aws-cdk@2 deploy GymCi`, then set the three GitHub variables from its outputs.
4. Run the **Infrastructure** workflow. The certificate waits for its DNS validation CNAME, which you add at the
   registrar.
5. Run the **Backend** workflow. It creates the ECS service.
6. Run the **Frontend** workflow.
7. At the registrar, set the CNAME `app` to the `GymFrontend` output `CloudFrontDomain`.
8. Create the users (below).

## Users

Self sign-up is off. The user pool is the list of who may use the app.

```sh
aws cognito-idp admin-create-user \
  --user-pool-id "$(aws ssm get-parameter --name /gym/auth/user-pool-id --query Parameter.Value --output text)" \
  --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true \
  --desired-delivery-mediums EMAIL
```

Cognito emails a temporary password. To remove someone, use `admin-delete-user`.

## Local development against the deployed Cognito

`localhost:5173/auth/callback` is an allowed callback URL. Put the IDs from `/gym/auth/*` into
`frontend/public/config.json`:

```json
{
  "authority": "https://cognito-idp.eu-west-1.amazonaws.com/<user pool id>",
  "clientId": "<client id>",
  "cognitoDomain": "gym-beatrix.auth.eu-west-1.amazoncognito.com",
  "apiBaseUrl": "http://localhost:8100/api"
}
```

Also set `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` in `backend/.env`. Don't commit real values. The release
writes the production `config.json`.

## Gotchas

- **CloudFront and DNS:** CloudFront refuses to create a distribution for `app.beatrix.co.za` while that name's DNS
  record points at another CloudFront distribution. When you replace `GymFrontend`, delete the `app` record first,
  deploy, then point the record at the new `CloudFrontDomain`.
- **A failed first create can leave a Cloud Map namespace behind.** The next deploy then fails with
  `ConflictingDomainExists` for `gym.internal`. Find it with
  `aws servicediscovery list-namespaces`, delete its services and the namespace, then re-run.
- **Stacks that hold state:** `GymDatabase` and `GymAuth` have termination protection. Turn it off on purpose before
  deleting (`aws cloudformation update-termination-protection --no-enable-termination-protection --stack-name …`).
  When deleted, the user pool is kept and still holds the `gym-beatrix` domain, Aurora leaves a final snapshot, and
  the ECR repository is kept. Delete these by hand before you create the stacks again.
- **Only one GitHub OIDC provider per account.** `GymCi` references it and never creates or deletes it.
