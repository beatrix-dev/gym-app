from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models.meal import FoodCategory, MealType


class FoodItemCreate(BaseModel):
    name: str
    category: FoodCategory | None = None
    calories_per_100g: float | None = None
    protein_per_100g: float | None = None
    carbs_per_100g: float | None = None
    fat_per_100g: float | None = None
    is_public: bool = False


class FoodItemUpdate(BaseModel):
    name: str | None = None
    category: FoodCategory | None = None
    calories_per_100g: float | None = None
    protein_per_100g: float | None = None
    carbs_per_100g: float | None = None
    fat_per_100g: float | None = None
    is_public: bool | None = None


class FoodItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: FoodCategory | None = None
    calories_per_100g: float | None = None
    protein_per_100g: float | None = None
    carbs_per_100g: float | None = None
    fat_per_100g: float | None = None
    is_public: bool
    created_by_user_id: int | None = None


class MealPlanEntryCreate(BaseModel):
    food_item_id: int
    meal_type: MealType | None = None
    quantity_grams: float = Field(gt=0)


class MealPlanEntryUpdate(BaseModel):
    food_item_id: int | None = None
    meal_type: MealType | None = None
    quantity_grams: float | None = Field(default=None, gt=0)


class MealPlanEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meal_plan_id: int
    meal_type: MealType | None = None
    quantity_grams: float
    food_item: FoodItemOut


class MealPlanCreate(BaseModel):
    plan_date: date


class MealPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    plan_date: date
    entries: list[MealPlanEntryOut] = []


class DailyTotalsOut(BaseModel):
    meal_plan_id: int
    plan_date: date
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    daily_calorie_target: int | None = None
    calories_remaining: float | None = None
