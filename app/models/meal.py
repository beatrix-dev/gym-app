import enum

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DECIMAL,
    Enum,
    ForeignKey,
    String,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class MealType(str, enum.Enum):
    breakfast = "breakfast"
    lunch = "lunch"
    dinner = "dinner"
    snack = "snack"


class FoodCategory(str, enum.Enum):
    protein = "protein"
    dairy = "dairy"
    grains = "grains"
    produce = "produce"
    fats_oils = "fats_oils"
    other = "other"


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    category = Column(Enum(FoodCategory), nullable=True)
    calories_per_100g = Column(DECIMAL(6, 2))
    protein_per_100g = Column(DECIMAL(5, 2))
    carbs_per_100g = Column(DECIMAL(5, 2))
    fat_per_100g = Column(DECIMAL(5, 2))
    is_public = Column(Boolean, default=False)
    created_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)

    created_by = relationship("User", back_populates="food_items")
    meal_plan_entries = relationship("MealPlanEntry", back_populates="food_item")


class MealPlan(Base):
    __tablename__ = "meal_plans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    plan_date = Column(Date, nullable=False)

    user = relationship("User", back_populates="meal_plans")
    entries = relationship("MealPlanEntry", back_populates="meal_plan", cascade="all, delete-orphan")


class MealPlanEntry(Base):
    __tablename__ = "meal_plan_entries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    meal_plan_id = Column(BigInteger, ForeignKey("meal_plans.id"), nullable=False)
    meal_type = Column(Enum(MealType))
    food_item_id = Column(BigInteger, ForeignKey("food_items.id"), nullable=False)
    quantity_grams = Column(DECIMAL(6, 2), nullable=False)

    meal_plan = relationship("MealPlan", back_populates="entries")
    food_item = relationship("FoodItem", back_populates="meal_plan_entries")
