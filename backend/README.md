# Gym Tracker backend

FastAPI + SQLAlchemy + MySQL, authenticated with Cognito ID tokens.

## Run with Docker Compose

```sh
cp .env.example .env   # set COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, ALLOWED_EMAILS (e.g. you@example.com)
docker compose up -d --build
curl localhost:8100/api/health
```

The container entrypoint runs `alembic upgrade head`, then the idempotent seeds
(`app.seed`, `app.seed_food`), then starts uvicorn on port 8100. Compose uses its
own fresh MySQL volume; the current migrations assume an empty `users` table.
`docker compose down -v` resets the database.

## Run without Docker

```sh
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # DATABASE_URL points at MySQL on localhost:3306
docker compose up -d mysql      # or any MySQL 8 instance
alembic upgrade head
python -m app.seed && python -m app.seed_food
uvicorn app.main:app --reload --port 8100
```

## Tests

```sh
pytest
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Full DB URL; otherwise built from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |
| `ALLOWED_ORIGINS` | CORS origins |
| `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID` | Token verification |
| `ALLOWED_EMAILS` | Email allowlist |
