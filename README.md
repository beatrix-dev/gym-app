# Gym & Grocery Tracker

A personal app for logging workouts, planning training, and tracking meals and macros. It runs entirely on AWS.
Sign-in is an Amazon Cognito email + password account; self sign-up is off, so only accounts the owner creates
can get in.

## Layout

| Folder | Contents |
| --- | --- |
| `backend/` | FastAPI + SQLAlchemy + Alembic API on MySQL. See [backend/README.md](backend/README.md) |
| `frontend/` | Vue 3 + TypeScript + Vite SPA |
| `infrastructure/` | AWS CDK (Java): hosting, API, database, auth, CI role. See [infrastructure/README.md](infrastructure/README.md) |

## Architecture

```
Browser
  |
  v
CloudFront (app.beatrix.co.za, ACM cert from us-east-1)
  |-- /*      --> S3 (Vue SPA + generated config.json)
  |-- /api/*  --> API Gateway HTTP API (Cognito JWT authorizer)
                    |
                    v  VPC Link
                  Fargate service (FastAPI, found via Cloud Map)
                    |
                    v
                  Aurora Serverless v2 (MySQL, scales to 0 ACU)

Sign-in: SPA --> Cognito hosted login (email + password) --> SPA (/auth/callback)
```

## Frontend runtime config

The frontend reads `/config.json` at startup (`frontend/public/config.json`). For local dev, fill `authority`,
`clientId` and `cognitoDomain` from the Cognito stack outputs; `apiBaseUrl` defaults to
`http://localhost:8100/api`. In production the file is generated at deploy time with `apiBaseUrl` set to `/api`.
Details are in [infrastructure/README.md](infrastructure/README.md).

## Development

```sh
# Backend (from backend/)
pip install -r requirements-dev.txt && pytest

# Frontend (from frontend/)
npm ci && npm run build && npm run test

# Infrastructure (from infrastructure/, needs JDK 21 and Node)
mvn -B test
```

## Deployment

Each part releases on its own when its folder changes on `main`:

- `backend/` → `.github/workflows/backend.yml` builds the image and rolls it out to ECS.
- `frontend/` → `.github/workflows/frontend.yml` uploads the build to S3 and clears the CloudFront cache.
- `infrastructure/` → `.github/workflows/infrastructure.yml` deploys the CDK stacks.

The stacks, rollback, adding an API, and the one-time first deploy are in
[infrastructure/README.md](infrastructure/README.md).
