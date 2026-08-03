# Gym & Grocery Tracker — Backend

FastAPI + SQLAlchemy + Alembic, backed by local MySQL via Docker Compose.

## Setup

```bash
# 1. Start local MySQL
docker compose up -d

# wait ~10s for the healthcheck to pass, then confirm:
docker compose ps

# 2. Python environment
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Env file
cp .env.example .env
# adjust DATABASE_URL / SECRET_KEY if needed - defaults match docker-compose.yml

# 4. Run the migration (creates all 10 tables in MySQL)
alembic upgrade head

# 5. Seed the global exercise catalog (safe to re-run)
python -m app.seed

# 6. Run the API
uvicorn app.main:app --reload --port 8100
```

Then visit:
- http://localhost:8100/docs — interactive Swagger UI
- http://localhost:8100/health — confirms the API can reach MySQL

### Verifying the migration worked

```bash
docker compose exec mysql mysql -u gymapp -pgymapppassword gym_tracker -e "SHOW TABLES;"
```

You should see all 10 tables: users, exercises, food_items, meal_plans, meal_plan_entries,
workout_plans, workout_plan_days, workout_plan_exercises, workout_sessions, session_sets.

## What's here

- `docker-compose.yml` — local MySQL 8.0, matches Cloud SQL's engine so behavior transfers when you deploy to GKE later
- `app/core/config.py` — settings loaded from `.env` via pydantic-settings
- `app/core/database.py` — SQLAlchemy engine/session, `get_db()` FastAPI dependency
- `app/models/` — one file per logical group (user, exercise, workout, meal), translated 1:1 from the DBML schema
- `migrations/` — Alembic setup; `versions/46cd47be4b48_initial_schema.py` is the first migration, already generated and reviewed — this creates all 10 tables plus the two extra indexes we added for history/PR query performance
- `app/seed.py` — seeds ~39 global exercises (`created_by_user_id IS NULL`) across all muscle groups/equipment types; idempotent, safe to re-run

## Roadmap

Status legend: ✅ done · 🚧 in progress · ⬜ not started

### Phase 1 — Backend core ✅ (2–3 sessions)

FastAPI + SQLAlchemy + Alembic migrations against local MySQL (Docker Compose, not Cloud SQL yet — keep infra out of this phase entirely).

- [x] SQLAlchemy models mirroring the DBML schema (`app/models/`)
- [x] Alembic initial migration — creates all 10 tables + history/PR indexes
- [x] DB engine/session setup + `/health` endpoint
- [x] Auth (JWT, simple — don't over-engineer this early)
- [x] Pydantic request/response schemas (`app/schemas/`)
- [x] Exercises CRUD (create/list/get)
- [x] Seed a starter catalog (30–40 common exercises)
- [x] Workout plans + sessions + sets logging
- [x] PR calculation endpoint (max weight per exercise, or e1RM formula if fancier)

**Deliverable:** Swagger docs (`/docs`) where you can manually exercise every endpoint with curl/Postman.

### Phase 2 — Frontend core ✅ (2–3 sessions)

Vue 3 + TypeScript + Vite, talking to the FastAPI backend locally.

- [x] Auth flow (login/register)
- [x] Exercise log UI — the "enter today's sets/weights" screen (highest-frequency user action)
- [x] PR display (personal bests per exercise)

**Deliverable:** you can log a real workout end-to-end through the UI.

### Phase 3 — Workout planner + recommendations ✅ (2 sessions)

- [x] Planner: CRUD UI for building a plan (days → exercises → target sets/reps) — create/delete only, no in-place edit yet
- [x] Recommendations: rule-based, not ML — reps-vs-target plus logged RPE as a fatigue guard, surfaced in the Planner and inline during logging

### Phase 4 — Meal planning ✅ (2 sessions)

- [x] Food item catalog + macros — seeded starter catalog (`app/seed_food.py`) plus user-created items, same visibility model as exercises
- [x] Meal plan builder (assign foods to meals to days) — one plan per date, entries assign a food item + meal type + quantity
- [x] Daily macro totals view (calories/protein/carbs/fat vs. a target you set) — calories compared against `daily_calorie_target` (settable via `PATCH /auth/me`); protein/carbs/fat shown as informational totals

**Deliverable:** stays decoupled from the workout side except sharing the `users` table — good chance to practice clean module boundaries in one codebase.

### Phase 5 — GKE deployment ✅ (2–3 sessions)

Own Terraform root config in `terraform/`, sourcing shared modules from `infrastructure-terraform-gcp` (git-pinned, not copied):

- [x] Cloud SQL for MySQL (Terraform) — public IP, SSL-only, reachable only via a Cloud SQL Auth Proxy sidecar authenticated through Workload Identity
- [x] Dockerize frontend/backend
- [x] Artifact Registry
- [x] GKE deployment manifests (Kustomize) — `k8s/`
- [x] Frontend egress via a plain `LoadBalancer` Service (not an Ingress resource — no path-based routing/TLS termination layer yet)

### Phase 6 — CI/CD + polish ⬜ (1–2 sessions)

- [ ] GitHub Actions build/push
- [ ] Basic health checks in CI
- [ ] Blog post write-up

## Contributing to this tracker

When a task is finished, tick its box and flip the phase status once every item in it is checked.
Add new sub-tasks under the relevant phase as scope becomes clearer — keep it in sync with reality rather than planning too far ahead.
