# Infrastructure (CDK, Java)

> **Do not merge or push to `main` until the one-time bootstrap below is complete.** Merging is a push to `main`,
> which triggers the deploy job, and that job needs the deploy role and the `AWS_DEPLOY_ROLE_ARN` GitHub variable.

Three stacks, all in `za.co.beatrix.gym`:

| Stack | Region | Purpose |
| --- | --- | --- |
| `GymCertificate` | us-east-1 | ACM certificate for `app.beatrix.co.za` (CloudFront requires us-east-1) |
| `GymCi` | eu-west-1 | GitHub OIDC provider and the deploy role CI assumes. Deployed manually once, never from CI |
| `Gym` | eu-west-1 | VPC (no NAT), Aurora Serverless v2, Fargate backend, Cognito, HTTP API, S3 + CloudFront. Depends on `GymCertificate` |

Everything runs on AWS. Sign-in uses Cognito email + password accounts that only an administrator can create, so
the user pool itself is the list of who may use the app.

## Requirements for every CDK command

- `frontend/dist` must exist (`cd frontend && npm ci && npm run build`); the app bundles it.
- JDK 21, Node (the tests run `node`), and Docker (the backend image is built for linux/amd64).

Local tests:

```sh
cd infrastructure
# Only needed if ~/.mavenrc forces another JDK (as on the owner's machine):
MAVEN_SKIP_RC=true JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -B test
```

CI does not need the `MAVEN_SKIP_RC`/`JAVA_HOME` prefix.

## One-time bootstrap

Run from `infrastructure/`. Replace `<acct>` with your AWS account ID.

### 1. Bootstrap CDK in both regions

```sh
npx aws-cdk@2 bootstrap aws://<acct>/eu-west-1 aws://<acct>/us-east-1
```

### 2. Deploy the certificate and validate it

```sh
npx aws-cdk@2 deploy GymCertificate
```

The deploy waits until the certificate validates. While it waits, in another shell fetch the validation record:

```sh
aws acm list-certificates --region us-east-1   # find the certificate ARN
aws acm describe-certificate --region us-east-1 --certificate-arn <arn> \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add that CNAME (name and value) at your DNS registrar (xneelo/Afrihost). The deploy completes once DNS propagates.

### 3. Deploy the CI stack

```sh
npx aws-cdk@2 deploy GymCi
```

Note the `DeployRoleArn` output. Then in the GitHub repo (Settings > Secrets and variables > Actions > **Variables**,
not Secrets: the workflow reads it with `vars.`) set:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` output |

Gotcha: an AWS account allows only one GitHub OIDC provider. If one already exists, the `GymCi` deploy fails.
Either delete the unused provider (IAM > Identity providers) or adapt `CiStack` to import the existing one.

### 4. Deploy the app (locally)

The first `Gym` deploy is done locally only:

```sh
npx aws-cdk@2 deploy Gym GymCertificate
```

### 5. Point DNS at CloudFront

Add `app CNAME <CloudFrontDomain>` at the registrar, using the `CloudFrontDomain` stack output. Wait for DNS to
resolve (`dig app.beatrix.co.za`) before continuing.

### 6. Create your account

Self sign-up is off, so create each user yourself. Cognito emails them a temporary password, and they choose their
own password on first sign-in:

```sh
aws cognito-idp admin-create-user --region eu-west-1 \
  --user-pool-id <UserPoolId> \
  --username you@example.com \
  --user-attributes Name=email,Value=you@example.com Name=email_verified,Value=true \
  --desired-delivery-mediums EMAIL
```

Repeat for anyone else who should have access. To remove someone, `aws cognito-idp admin-delete-user` (or disable
them in the Cognito console).

### 7. Verify

- `https://app.beatrix.co.za/meals` loads the SPA.
- `https://app.beatrix.co.za/api/nope` returns a JSON 401, not the SPA.
- "Sign in" goes to the Cognito login page; signing in with the account from step 6 lands on `/log`.
- After about 10 minutes idle, Aurora reaches 0 ACU (CloudWatch `ServerlessDatabaseCapacity`); the next request
  shows "Waking up..." and then succeeds.
- After more than 5 minutes idle, sign in again and confirm the "Waking up..." banner, then success.

### 8. Hand over to CI

Now merge/push to `main`; CI will deploy and smoke-test `https://app.beatrix.co.za/api/health/db`.

## Stack outputs (`Gym`)

`CognitoDomain`, `UserPoolId`, `UserPoolClientId`, `CloudFrontDomain`.

```sh
aws cloudformation describe-stacks --region eu-west-1 --stack-name Gym \
  --query 'Stacks[0].Outputs' --output table
```

## Local development against the deployed Cognito

`localhost:5173/auth/callback` is already an allowed callback URL.

`frontend/public/config.json`:

```json
{
  "authority": "https://cognito-idp.eu-west-1.amazonaws.com/<UserPoolId>",
  "clientId": "<UserPoolClientId>",
  "cognitoDomain": "gym-beatrix.auth.eu-west-1.amazoncognito.com",
  "apiBaseUrl": "http://localhost:8100/api"
}
```

`backend/.env` (copy from `.env.example`):

```
COGNITO_USER_POOL_ID=<UserPoolId>
COGNITO_CLIENT_ID=<UserPoolClientId>
```

In production `config.json` is generated at deploy time with `apiBaseUrl` set to `/api`, so do not commit real
values from the local file.

## Gotchas

- The Cognito user pool has `RemovalPolicy.RETAIN`. Deleting and redeploying `Gym` leaves the old pool holding the
  `gym-beatrix` domain prefix, so the redeploy fails. Delete the old user pool manually first (Cognito console, or
  `aws cognito-idp delete-user-pool-domain` then `delete-user-pool`).
- Cognito's built-in email sender is limited to a small number of emails per day. That is plenty for invitations
  and password resets for a handful of users.
- `GymCi` is deployed manually; CI only deploys `Gym` and `GymCertificate`.
