from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routers import auth, exercises, food_items, meal_plans, workout_plans, workout_sessions

app = FastAPI(title="Gym & Grocery Tracker API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(food_items.router)
app.include_router(meal_plans.router)
app.include_router(workout_plans.router)
app.include_router(workout_sessions.router)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Proves the API can reach MySQL - the same kind of check
    the ALB target group would hit in a real deployment."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "db": "connected"}
