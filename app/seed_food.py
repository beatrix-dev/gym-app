"""One-off script to seed the global food item catalog.

Run with: python -m app.seed_food
Safe to re-run - skips any seeded food name that already exists.
"""

from app.core.database import SessionLocal
from app.models.meal import FoodItem

# name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
FOOD_ITEMS = [
    ("Chicken Breast, cooked", 165, 31.0, 0.0, 3.6),
    ("Chicken Thigh, cooked", 209, 26.0, 0.0, 10.9),
    ("Salmon, cooked", 208, 20.4, 0.0, 13.4),
    ("Tuna, canned in water", 116, 25.5, 0.0, 0.8),
    ("Lean Ground Beef (90/10), cooked", 217, 26.1, 0.0, 11.8),
    ("Pork Tenderloin, cooked", 143, 26.0, 0.0, 3.5),
    ("Shrimp, cooked", 99, 24.0, 0.2, 0.3),
    ("Egg, whole", 155, 13.0, 1.1, 11.0),
    ("Egg White", 52, 10.9, 0.7, 0.2),
    ("Greek Yogurt, plain nonfat", 59, 10.0, 3.6, 0.4),
    ("Cottage Cheese, low-fat", 72, 12.4, 2.7, 1.9),
    ("Whey Protein Powder", 380, 80.0, 8.0, 4.0),
    ("Tofu, firm", 144, 15.5, 3.9, 8.7),
    ("Tempeh", 192, 20.3, 7.6, 10.8),
    ("Black Beans, cooked", 132, 8.9, 23.7, 0.5),
    ("Lentils, cooked", 116, 9.0, 20.1, 0.4),
    ("Chickpeas, cooked", 164, 8.9, 27.4, 2.6),
    ("Brown Rice, cooked", 123, 2.7, 25.6, 1.0),
    ("White Rice, cooked", 130, 2.7, 28.2, 0.3),
    ("Quinoa, cooked", 120, 4.4, 21.3, 1.9),
    ("Oats, dry", 389, 16.9, 66.3, 6.9),
    ("Whole Wheat Bread", 247, 13.0, 41.0, 3.4),
    ("Sweet Potato, baked", 90, 2.0, 20.7, 0.2),
    ("Potato, baked", 93, 2.5, 21.2, 0.1),
    ("Whole Wheat Pasta, cooked", 124, 5.3, 25.1, 1.1),
    ("Banana", 89, 1.1, 22.8, 0.3),
    ("Apple", 52, 0.3, 13.8, 0.2),
    ("Blueberries", 57, 0.7, 14.5, 0.3),
    ("Broccoli, steamed", 35, 2.4, 7.2, 0.4),
    ("Spinach, raw", 23, 2.9, 3.6, 0.4),
    ("Mixed Green Salad", 20, 1.5, 3.8, 0.2),
    ("Avocado", 160, 2.0, 8.5, 14.7),
    ("Olive Oil", 884, 0.0, 0.0, 100.0),
    ("Almonds", 579, 21.2, 21.6, 49.9),
    ("Peanut Butter", 588, 25.1, 20.0, 50.4),
    ("Walnuts", 654, 15.2, 13.7, 65.2),
    ("Whole Milk", 61, 3.2, 4.8, 3.3),
    ("Skim Milk", 34, 3.4, 5.0, 0.1),
    ("Cheddar Cheese", 403, 25.0, 1.3, 33.1),
    ("Dark Chocolate (70-85%)", 598, 7.8, 45.9, 42.6),
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing_names = {
            name
            for (name,) in db.query(FoodItem.name)
            .filter(FoodItem.created_by_user_id.is_(None))
            .all()
        }
        to_insert = [
            FoodItem(
                name=name,
                calories_per_100g=calories,
                protein_per_100g=protein,
                carbs_per_100g=carbs,
                fat_per_100g=fat,
                is_public=False,
                created_by_user_id=None,
            )
            for name, calories, protein, carbs, fat in FOOD_ITEMS
            if name not in existing_names
        ]
        db.add_all(to_insert)
        db.commit()
        print(f"Seeded {len(to_insert)} food items ({len(FOOD_ITEMS) - len(to_insert)} already existed).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
