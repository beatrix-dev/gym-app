"""One-off script to seed the global exercise catalog.

Run with: python -m app.seed
Safe to re-run - skips any seeded exercise name that already exists.
"""

from app.core.database import SessionLocal
from app.models.exercise import Equipment, Exercise, ExerciseCategory, MuscleGroup

M, E, C = MuscleGroup, Equipment, ExerciseCategory

EXERCISES = [
    # name, muscle_group, equipment, category
    ("Barbell Back Squat", M.legs, E.barbell, C.compound),
    ("Front Squat", M.legs, E.barbell, C.compound),
    ("Romanian Deadlift", M.legs, E.barbell, C.compound),
    ("Conventional Deadlift", M.full_body, E.barbell, C.compound),
    ("Leg Press", M.legs, E.machine, C.compound),
    ("Walking Lunge", M.legs, E.dumbbell, C.compound),
    ("Leg Extension", M.legs, E.machine, C.isolation),
    ("Leg Curl", M.legs, E.machine, C.isolation),
    ("Standing Calf Raise", M.legs, E.machine, C.isolation),
    ("Barbell Bench Press", M.chest, E.barbell, C.compound),
    ("Incline Dumbbell Press", M.chest, E.dumbbell, C.compound),
    ("Push-Up", M.chest, E.bodyweight, C.compound),
    ("Cable Chest Fly", M.chest, E.cable, C.isolation),
    ("Dumbbell Fly", M.chest, E.dumbbell, C.isolation),
    ("Pull-Up", M.back, E.bodyweight, C.compound),
    ("Barbell Row", M.back, E.barbell, C.compound),
    ("Lat Pulldown", M.back, E.cable, C.compound),
    ("Seated Cable Row", M.back, E.cable, C.compound),
    ("Single-Arm Dumbbell Row", M.back, E.dumbbell, C.compound),
    ("Overhead Press", M.shoulders, E.barbell, C.compound),
    ("Dumbbell Lateral Raise", M.shoulders, E.dumbbell, C.isolation),
    ("Face Pull", M.shoulders, E.cable, C.isolation),
    ("Arnold Press", M.shoulders, E.dumbbell, C.compound),
    ("Rear Delt Fly", M.shoulders, E.dumbbell, C.isolation),
    ("Barbell Curl", M.arms, E.barbell, C.isolation),
    ("Dumbbell Hammer Curl", M.arms, E.dumbbell, C.isolation),
    ("Triceps Pushdown", M.arms, E.cable, C.isolation),
    ("Skull Crusher", M.arms, E.barbell, C.isolation),
    ("Dumbbell Curl", M.arms, E.dumbbell, C.isolation),
    ("Close-Grip Bench Press", M.arms, E.barbell, C.compound),
    ("Plank", M.core, E.bodyweight, C.isolation),
    ("Hanging Leg Raise", M.core, E.bodyweight, C.isolation),
    ("Cable Crunch", M.core, E.cable, C.isolation),
    ("Russian Twist", M.core, E.other, C.isolation),
    ("Ab Wheel Rollout", M.core, E.other, C.compound),
    ("Kettlebell Swing", M.full_body, E.other, C.compound),
    ("Burpee", M.full_body, E.bodyweight, C.compound),
    ("Thruster", M.full_body, E.barbell, C.compound),
    ("Clean and Jerk", M.full_body, E.barbell, C.compound),
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing_names = {
            name
            for (name,) in db.query(Exercise.name)
            .filter(Exercise.created_by_user_id.is_(None))
            .all()
        }
        to_insert = [
            Exercise(
                name=name,
                muscle_group=muscle_group,
                equipment=equipment,
                category=category,
                is_custom=False,
                created_by_user_id=None,
            )
            for name, muscle_group, equipment, category in EXERCISES
            if name not in existing_names
        ]
        db.add_all(to_insert)
        db.commit()
        print(f"Seeded {len(to_insert)} exercises ({len(EXERCISES) - len(to_insert)} already existed).")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
