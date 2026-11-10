from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.routers import auth, exercises, food_items, meal_plans, workout_plans, workout_sessions

app = FastAPI(title="Gym & Grocery Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
for router in (
    auth.router,
    exercises.router,
    food_items.router,
    meal_plans.router,
    workout_plans.router,
    workout_sessions.router,
):
    api.include_router(router)


@api.get("/health")
def health_check():
    """Liveness probe for the ALB target group - deliberately does not touch the DB."""
    return {"status": "ok"}


@api.get("/health/db")
def health_check_db(db: Session = Depends(get_db)):
    """Readiness check proving the API can reach MySQL."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "db": "connected"}


app.include_router(api)
