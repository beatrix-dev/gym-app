from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.meal import FoodItem, MealPlanEntry
from app.models.user import User
from app.schemas.meal import FoodItemCreate, FoodItemOut, FoodItemUpdate

router = APIRouter(prefix="/food-items", tags=["food-items"])


def _visible_to(user: User):
    """A food item is visible if it's global/seeded, public, or owned by the caller."""
    return or_(
        FoodItem.created_by_user_id.is_(None),
        FoodItem.is_public.is_(True),
        FoodItem.created_by_user_id == user.id,
    )


def _get_owned_food_item(db: Session, food_item_id: int, user: User) -> FoodItem:
    item = db.get(FoodItem, food_item_id)
    if item is None or item.created_by_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
    return item


@router.post("", response_model=FoodItemOut, status_code=status.HTTP_201_CREATED)
def create_food_item(
    payload: FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    food_item = FoodItem(**payload.model_dump(), created_by_user_id=current_user.id)
    db.add(food_item)
    db.commit()
    db.refresh(food_item)
    return food_item


@router.get("", response_model=list[FoodItemOut])
def list_food_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(FoodItem).filter(_visible_to(current_user)).order_by(FoodItem.name).all()


@router.get("/{food_item_id}", response_model=FoodItemOut)
def get_food_item(
    food_item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    food_item = (
        db.query(FoodItem)
        .filter(FoodItem.id == food_item_id, _visible_to(current_user))
        .first()
    )
    if food_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Food item not found")
    return food_item


@router.patch("/{food_item_id}", response_model=FoodItemOut)
def update_food_item(
    food_item_id: int,
    payload: FoodItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    food_item = _get_owned_food_item(db, food_item_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(food_item, field, value)
    db.commit()
    db.refresh(food_item)
    return food_item


@router.delete("/{food_item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_item(
    food_item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    food_item = _get_owned_food_item(db, food_item_id, current_user)
    in_use = (
        db.query(MealPlanEntry).filter(MealPlanEntry.food_item_id == food_item_id).first()
    )
    if in_use is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Food item is used in a meal plan",
        )
    db.delete(food_item)
    db.commit()
