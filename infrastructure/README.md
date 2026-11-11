# Infrastructure (CDK, Java)

Three stacks, all in `za.co.beatrix.gym`:

| Stack | Region | Purpose |
| --- | --- | --- |
| `GymCertificate` | us-east-1 | ACM certificate for `app.beatrix.co.za` (CloudFront requires us-east-1) |
| `GymCi` | eu-west-1 | GitHub OIDC provider and the deploy role CI assumes. Deployed manually once, never from CI |
| `Gym` | eu-west-1 | VPC (no NAT), Aurora Serverless v2, Fargate backend, Cognito + Google, HTTP API, S3 + CloudFront. Depends on `GymCertificate` |

## Requirements for every CDK command

- `frontend/dist` must exist (`cd frontend && npm ci && npm run build`); the app bundles it.
- Every `cdk` command (synth, deploy, including `GymCi` and `GymCertificate`) needs both context values,
  otherwise synth fails:
  `-c allowedEmails=you@example.com -c googleClientId=<google-client-id>`
- JDK 21, Node (the tests run `node`), and Docker (the backend image is built for linux/amd64).

Local tests:

```sh
cd infrastructure
# Only needed if ~/.mavenrc forces another JDK (as on the owner's machine):
MAVEN_SKIP_RC=true JAVA_HOME=$(/usr/libexec/java_home -v 21) mvn -B test
```

CI does not need the `MAVEN_SKIP_RC`/`JAVA_HOME` prefix.

## One-time bootstrap

Run from `infrastructure/`. Replace `<acct>` with your AWS account ID, and `<google-client-id>` once you have it
(step 3). Define the context flags once as an array (works in bash and zsh):

```sh
CTX=(-c allowedEmails=you@example.com -c googleClientId=<google-client-id>)
```

### 1. Bootstrap CDK in both regions

```sh
npx aws-cdk@2 bootstrap aws://<acct>/eu-west-1 aws://<acct>/us-east-1 "${CTX[@]}"
```

### 2. Create the Google OAuth client (first)

The Cognito domain prefix is fixed, so the redirect URI is known before anything is deployed. In the Google Cloud
Console (APIs & Services > Credentials) create an OAuth client of type "Web application" with:

- Authorised redirect URI: `https://gym-beatrix.auth.eu-west-1.amazoncognito.com/oauth2/idpresponse`

(This matches the `GoogleRedirectUri` stack output.) Keep the client ID and secret.

### 3. Store the Google client secret

It must exist in Secrets Manager (eu-west-1) before `Gym` is deployed:

```sh
aws secretsmanager create-secret --region eu-west-1 \
  --name gym-app/google-oauth-client-secret \
  --secret-string '<google-client-secret>'
```

Now set `CTX` with the real client ID.

### 4. Deploy the certificate and validate it

```sh
npx aws-cdk@2 deploy GymCertificate "${CTX[@]}"
```

The deploy waits until the certificate validates. While it waits, in another shell fetch the validation record:

```sh
aws acm list-certificates --region us-east-1   # find the certificate ARN
aws acm describe-certificate --region us-east-1 --certificate-arn <arn> \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add that CNAME (name and value) at your DNS registrar (xneelo/Afrihost). The deploy completes once DNS propagates.

### 5. Deploy the CI stack

```sh
npx aws-cdk@2 deploy GymCi "${CTX[@]}"
```

Note the `DeployRoleArn` output. Then in the GitHub repo (Settings > Secrets and variables > Actions > Variables) set:

| Variable | Value |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` output |
| `ALLOWED_EMAILS` | the same value you pass as `allowedEmails` |
| `GOOGLE_CLIENT_ID` | the Google client ID from step 2 |

Gotcha: an AWS account allows only one GitHub OIDC provider. If one already exists, the `GymCi` deploy fails.
Either delete the unused provider (IAM > Identity providers) or adapt `CiStack` to import the existing one.

### 6. Deploy the app

Either push to `main` (CI runs `cdk deploy Gym GymCertificate`) or run it locally:

```sh
npx aws-cdk@2 deploy Gym GymCertificate "${CTX[@]}"
```

### 7. Point DNS at CloudFront

Add `app CNAME <CloudFrontDomain>` at the registrar, using the `CloudFrontDomain` stack output.

### 8. Verify

- `https://app.beatrix.co.za/meals` loads the SPA.
- `https://app.beatrix.co.za/api/nope` returns 401 JSON, not HTML.
- "Sign in with Google" with an allowed account lands on `/log`; any other account sees the not-allowed message.
- After about 10 minutes idle, Aurora reaches 0 ACU (CloudWatch `ServerlessDatabaseCapacity`); the next request
  shows "Waking up..." and then succeeds.

## Stack outputs (`Gym`)

`CognitoDomain`, `UserPoolId`, `UserPoolClientId`, `GoogleRedirectUri`, `CloudFrontDomain`.

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
ALLOWED_EMAILS=you@example.com
```

In production `config.json` is generated at deploy time with `apiBaseUrl` set to `/api`, so do not commit real
values from the local file.

## Gotchas

- The Cognito user pool has `RemovalPolicy.RETAIN`. Deleting and redeploying `Gym` leaves the old pool holding the
  `gym-beatrix` domain prefix, so the redeploy fails. Delete the old user pool manually first (Cognito console, or
  `aws cognito-idp delete-user-pool-domain` then `delete-user-pool`).
- `GymCi` is deployed manually; CI only deploys `Gym` and `GymCertificate`.
