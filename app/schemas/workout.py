from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.workout import DayOfWeek
from app.schemas.exercise import ExerciseOut


class WorkoutPlanExerciseCreate(BaseModel):
    exercise_id: int
    exercise_order: int | None = None
    target_sets: int | None = None
    target_reps_min: int | None = None
    target_reps_max: int | None = None


class WorkoutPlanExerciseUpdate(BaseModel):
    exercise_order: int | None = None
    target_sets: int | None = None
    target_reps_min: int | None = None
    target_reps_max: int | None = None


class WorkoutPlanExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_day_id: int
    exercise_order: int | None = None
    target_sets: int | None = None
    target_reps_min: int | None = None
    target_reps_max: int | None = None
    exercise: ExerciseOut


class WorkoutPlanDayCreate(BaseModel):
    day_order: int
    label: str | None = None
    day_of_week: DayOfWeek | None = None


class WorkoutPlanDayUpdate(BaseModel):
    day_order: int | None = None
    label: str | None = None
    day_of_week: DayOfWeek | None = None


class WorkoutPlanDayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    plan_id: int
    day_order: int
    label: str | None = None
    day_of_week: DayOfWeek | None = None
    plan_exercises: list[WorkoutPlanExerciseOut] = []


class WorkoutPlanCreate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_public: bool = False


class WorkoutPlanUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None
    is_public: bool | None = None


class WorkoutPlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    name: str | None = None
    description: str | None = None
    is_active: bool
    is_public: bool
    forked_from_plan_id: int | None = None
    created_at: datetime
    days: list[WorkoutPlanDayOut] = []


class SessionSetCreate(BaseModel):
    exercise_id: int
    set_order: int | None = None
    weight_kg: float
    reps: int
    rpe: float | None = None
    is_warmup: bool = False


class SessionSetUpdate(BaseModel):
    set_order: int | None = None
    weight_kg: float | None = None
    reps: int | None = None
    rpe: float | None = None
    is_warmup: bool | None = None


class SessionSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    exercise_id: int
    set_order: int | None = None
    weight_kg: float
    reps: int
    rpe: float | None = None
    is_warmup: bool


class WorkoutSessionCreate(BaseModel):
    plan_day_id: int | None = None
    started_at: datetime | None = None
    notes: str | None = None


class WorkoutSessionUpdate(BaseModel):
    ended_at: datetime | None = None
    notes: str | None = None


class WorkoutSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    plan_day_id: int | None = None
    started_at: datetime
    ended_at: datetime | None = None
    notes: str | None = None
    sets: list[SessionSetOut] = []


class PlanExerciseRecommendationOut(BaseModel):
    plan_exercise_id: int
    exercise_id: int
    target_reps_min: int | None = None
    target_reps_max: int | None = None
    last_session_id: int | None = None
    last_weight_kg: float | None = None
    last_reps: int | None = None
    last_rpe: float | None = None
    suggested_weight_kg: float | None = None
    rationale: str
