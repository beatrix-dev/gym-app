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
    UniqueConstraint,
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


class FoodUnit(str, enum.Enum):
    grams = "grams"
    ml = "ml"
    tbsp = "tbsp"
    tsp = "tsp"
    cup = "cup"
    piece = "piece"


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
    units = relationship("FoodItemUnit", back_populates="food_item", cascade="all, delete-orphan")


class FoodItemUnit(Base):
    """A food-specific conversion from a non-gram unit (tbsp, ml, piece, ...) to grams.

    Density/serving size varies per food, so conversions can't be generic
    (e.g. 1 tbsp of oil != 1 tbsp of flour) — each food defines its own.
    """

    __tablename__ = "food_item_units"
    __table_args__ = (UniqueConstraint("food_item_id", "unit", name="uq_food_item_unit"),)

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    food_item_id = Column(BigInteger, ForeignKey("food_items.id"), nullable=False)
    unit = Column(Enum(FoodUnit), nullable=False)
    grams_per_unit = Column(DECIMAL(7, 2), nullable=False)

    food_item = relationship("FoodItem", back_populates="units")


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
    quantity = Column(DECIMAL(7, 2), nullable=False)
    unit = Column(Enum(FoodUnit), nullable=False, default=FoodUnit.grams)

    meal_plan = relationship("MealPlan", back_populates="entries")
    food_item = relationship("FoodItem", back_populates="meal_plan_entries")
