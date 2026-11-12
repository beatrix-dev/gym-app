"""One-off script to seed the global food item catalog.

Run with: python -m app.seed_food
Safe to re-run - skips any seeded food name that already exists.
"""

from app.core.database import SessionLocal
from app.models.meal import FoodCategory, FoodItem, FoodItemUnit, FoodUnit

U = FoodUnit

# name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, units
# units: list of (unit, grams_per_unit) - the natural alternate unit(s) for that food, if any.
FOOD_ITEMS = [
    ("Chicken Breast, cooked", FoodCategory.protein, 165, 31.0, 0.0, 3.6, [(U.piece, 174)]),
    ("Chicken Thigh, cooked", FoodCategory.protein, 209, 26.0, 0.0, 10.9, [(U.piece, 52)]),
    ("Salmon, cooked", FoodCategory.protein, 208, 20.4, 0.0, 13.4, [(U.piece, 154)]),
    ("Tuna, canned in water", FoodCategory.protein, 116, 25.5, 0.0, 0.8, [(U.cup, 140)]),
    ("Lean Ground Beef (90/10), cooked", FoodCategory.protein, 217, 26.1, 0.0, 11.8, []),
    ("Pork Tenderloin, cooked", FoodCategory.protein, 143, 26.0, 0.0, 3.5, []),
    ("Shrimp, cooked", FoodCategory.protein, 99, 24.0, 0.2, 0.3, [(U.piece, 8)]),
    ("Egg, whole", FoodCategory.protein, 155, 13.0, 1.1, 11.0, [(U.piece, 50)]),
    ("Egg White", FoodCategory.protein, 52, 10.9, 0.7, 0.2, [(U.piece, 33)]),
    ("Greek Yogurt, plain nonfat", FoodCategory.dairy, 59, 10.0, 3.6, 0.4, [(U.cup, 245)]),
    ("Cottage Cheese, low-fat", FoodCategory.dairy, 72, 12.4, 2.7, 1.9, [(U.cup, 226)]),
    ("Whey Protein Powder", FoodCategory.protein, 380, 80.0, 8.0, 4.0, [(U.tbsp, 7)]),
    ("Tofu, firm", FoodCategory.protein, 144, 15.5, 3.9, 8.7, []),
    ("Tempeh", FoodCategory.protein, 192, 20.3, 7.6, 10.8, []),
    ("Black Beans, cooked", FoodCategory.protein, 132, 8.9, 23.7, 0.5, [(U.cup, 172)]),
    ("Lentils, cooked", FoodCategory.protein, 116, 9.0, 20.1, 0.4, [(U.cup, 198)]),
    ("Chickpeas, cooked", FoodCategory.protein, 164, 8.9, 27.4, 2.6, [(U.cup, 164)]),
    ("Brown Rice, cooked", FoodCategory.grains, 123, 2.7, 25.6, 1.0, [(U.cup, 195)]),
    ("White Rice, cooked", FoodCategory.grains, 130, 2.7, 28.2, 0.3, [(U.cup, 158)]),
    ("Quinoa, cooked", FoodCategory.grains, 120, 4.4, 21.3, 1.9, [(U.cup, 185)]),
    ("Oats, dry", FoodCategory.grains, 389, 16.9, 66.3, 6.9, [(U.cup, 81)]),
    ("Whole Wheat Bread", FoodCategory.grains, 247, 13.0, 41.0, 3.4, [(U.piece, 28)]),
    ("Sweet Potato, baked", FoodCategory.produce, 90, 2.0, 20.7, 0.2, [(U.piece, 114)]),
    ("Potato, baked", FoodCategory.produce, 93, 2.5, 21.2, 0.1, [(U.piece, 173)]),
    ("Whole Wheat Pasta, cooked", FoodCategory.grains, 124, 5.3, 25.1, 1.1, [(U.cup, 140)]),
    ("Banana", FoodCategory.produce, 89, 1.1, 22.8, 0.3, [(U.piece, 118)]),
    ("Apple", FoodCategory.produce, 52, 0.3, 13.8, 0.2, [(U.piece, 182)]),
    ("Blueberries", FoodCategory.produce, 57, 0.7, 14.5, 0.3, [(U.cup, 148)]),
    ("Broccoli, steamed", FoodCategory.produce, 35, 2.4, 7.2, 0.4, [(U.cup, 156)]),
    ("Spinach, raw", FoodCategory.produce, 23, 2.9, 3.6, 0.4, [(U.cup, 30)]),
    ("Mixed Green Salad", FoodCategory.produce, 20, 1.5, 3.8, 0.2, [(U.cup, 36)]),
    ("Avocado", FoodCategory.produce, 160, 2.0, 8.5, 14.7, [(U.piece, 150)]),
    ("Olive Oil", FoodCategory.fats_oils, 884, 0.0, 0.0, 100.0, [(U.tbsp, 13.5)]),
    ("Almonds", FoodCategory.fats_oils, 579, 21.2, 21.6, 49.9, [(U.cup, 143)]),
    ("Peanut Butter", FoodCategory.fats_oils, 588, 25.1, 20.0, 50.4, [(U.tbsp, 16)]),
    ("Walnuts", FoodCategory.fats_oils, 654, 15.2, 13.7, 65.2, [(U.cup, 117)]),
    ("Whole Milk", FoodCategory.dairy, 61, 3.2, 4.8, 3.3, [(U.cup, 244), (U.ml, 1.03)]),
    ("Skim Milk", FoodCategory.dairy, 34, 3.4, 5.0, 0.1, [(U.cup, 245), (U.ml, 1.03)]),
    ("Cheddar Cheese", FoodCategory.dairy, 403, 25.0, 1.3, 33.1, [(U.cup, 113)]),
    ("Dark Chocolate (70-85%)", FoodCategory.other, 598, 7.8, 45.9, 42.6, [(U.piece, 10)]),
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing_items = {
            item.name: item
            for item in db.query(FoodItem).filter(FoodItem.created_by_user_id.is_(None)).all()
        }
        to_insert = []
        backfilled_category = 0
        backfilled_units = 0
        for name, category, calories, protein, carbs, fat, units in FOOD_ITEMS:
            existing = existing_items.get(name)
            if existing is None:
                to_insert.append(
                    FoodItem(
                        name=name,
                        category=category,
                        calories_per_100g=calories,
                        protein_per_100g=protein,
                        carbs_per_100g=carbs,
                        fat_per_100g=fat,
                        is_public=False,
                        created_by_user_id=None,
                        units=[FoodItemUnit(unit=unit, grams_per_unit=grams) for unit, grams in units],
                    )
                )
            else:
                if existing.category is None:
                    existing.category = category
                    backfilled_category += 1
                if not existing.units and units:
                    existing.units = [
                        FoodItemUnit(unit=unit, grams_per_unit=grams) for unit, grams in units
                    ]
                    backfilled_units += 1
        db.add_all(to_insert)
        db.commit()
        print(
            f"Seeded {len(to_insert)} food items, backfilled category on {backfilled_category} "
            f"and units on {backfilled_units} existing items."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
