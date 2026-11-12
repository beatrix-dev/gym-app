#!/bin/sh
set -e

alembic upgrade head
python -m app.seed
python -m app.seed_food

exec uvicorn app.main:app --host 0.0.0.0 --port 8100
