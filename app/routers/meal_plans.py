from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.meal import FoodItem, MealPlan, MealPlanEntry
from app.models.user import User
from app.routers.food_items import _visible_to
from app.schemas.meal import (
    DailyTotalsOut,
    MealPlanCreate,
    MealPlanEntryCreate,
    MealPlanEntryOut,
    MealPlanEntryUpdate,
    MealPlanOut,
)

router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])


def _get_owned_plan(db: Session, plan_id: int, user: User) -> MealPlan:
    plan = db.get(MealPlan, plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found")
    return plan


def _get_owned_entry(db: Session, plan_id: int, entry_id: int, user: User) -> MealPlanEntry:
    _get_owned_plan(db, plan_id, user)
    entry = db.get(MealPlanEntry, entry_id)
    if entry is None or entry.meal_plan_id != plan_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan entry not found")
    return entry


def _get_visible_food_item(db: Session, food_item_id: int, user: User) -> FoodItem:
    food_item = (
        db.query(FoodItem)
        .filter(FoodItem.id == food_item_id, _visible_to(user))
        .first()
    )
    if food_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
    return food_item


@router.post("", response_model=MealPlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: MealPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = MealPlan(**payload.model_dump(), user_id=current_user.id)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=list[MealPlanOut])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(MealPlan)
        .filter(MealPlan.user_id == current_user.id)
        .order_by(MealPlan.plan_date.desc())
        .all()
    )


@router.get("/{plan_id}", response_model=MealPlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_plan(db, plan_id, current_user)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _get_owned_plan(db, plan_id, current_user)
    db.delete(plan)
    db.commit()


@router.post(
    "/{plan_id}/entries", response_model=MealPlanEntryOut, status_code=status.HTTP_201_CREATED
)
def add_entry(
    plan_id: int,
    payload: MealPlanEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_plan(db, plan_id, current_user)
    _get_visible_food_item(db, payload.food_item_id, current_user)

    # Two entries can share the same food_item_id + meal_type on one plan -
    # e.g. two separate 100g logs of rice at lunch. That's valid, not a bug.
    entry = MealPlanEntry(**payload.model_dump(), meal_plan_id=plan_id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{plan_id}/entries/{entry_id}", response_model=MealPlanEntryOut)
def update_entry(
    plan_id: int,
    entry_id: int,
    payload: MealPlanEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = _get_owned_entry(db, plan_id, entry_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if "food_item_id" in updates:
        _get_visible_food_item(db, updates["food_item_id"], current_user)
    for field, value in updates.items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{plan_id}/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    plan_id: int,
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = _get_owned_entry(db, plan_id, entry_id, current_user)
    db.delete(entry)
    db.commit()


def _compute_totals(db: Session, plan: MealPlan, user: User) -> DailyTotalsOut:
    entries = (
        db.query(MealPlanEntry)
        .options(joinedload(MealPlanEntry.food_item))
        .filter(MealPlanEntry.meal_plan_id == plan.id)
        .all()
    )

    calories = protein = carbs = fat = 0.0
    for entry in entries:
        ratio = float(entry.quantity_grams) / 100
        food = entry.food_item
        calories += ratio * float(food.calories_per_100g or 0)
        protein += ratio * float(food.protein_per_100g or 0)
        carbs += ratio * float(food.carbs_per_100g or 0)
        fat += ratio * float(food.fat_per_100g or 0)

    target = user.daily_calorie_target
    return DailyTotalsOut(
        meal_plan_id=plan.id,
        plan_date=plan.plan_date,
        total_calories=round(calories, 2),
        total_protein_g=round(protein, 2),
        total_carbs_g=round(carbs, 2),
        total_fat_g=round(fat, 2),
        daily_calorie_target=target,
        calories_remaining=round(target - calories, 2) if target is not None else None,
    )


@router.get("/{plan_id}/totals", response_model=DailyTotalsOut)
def get_daily_totals(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _get_owned_plan(db, plan_id, current_user)
    return _compute_totals(db, plan, current_user)
