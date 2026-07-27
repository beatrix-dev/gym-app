from sqlalchemy import BigInteger, Column, DECIMAL, Integer, String, TIMESTAMP, func
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))
    bodyweight_kg = Column(DECIMAL(5, 2))
    height_cm = Column(DECIMAL(5, 2))
    daily_calorie_target = Column(Integer)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # relationships back-reference the tables that FK to users.id
    exercises = relationship("Exercise", back_populates="created_by")
    workout_plans = relationship("WorkoutPlan", back_populates="user")
    workout_sessions = relationship("WorkoutSession", back_populates="user")
    food_items = relationship("FoodItem", back_populates="created_by")
    meal_plans = relationship("MealPlan", back_populates="user")
