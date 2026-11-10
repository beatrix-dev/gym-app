from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.exercise import Equipment, ExerciseCategory, MuscleGroup


class ExerciseCreate(BaseModel):
    name: str
    muscle_group: MuscleGroup | None = None
    equipment: Equipment | None = None
    category: ExerciseCategory | None = None
    is_public: bool = False


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    muscle_group: MuscleGroup | None = None
    equipment: Equipment | None = None
    category: ExerciseCategory | None = None
    is_custom: bool
    is_public: bool
    created_by_user_id: int | None = None


class PersonalRecordOut(BaseModel):
    exercise_id: int
    session_id: int
    weight_kg: float
    reps: int
    rpe: float | None = None
    estimated_1rm: float
    achieved_at: datetime
