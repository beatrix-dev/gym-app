from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import (
    SessionSet,
    WorkoutPlan,
    WorkoutPlanDay,
    WorkoutPlanExercise,
    WorkoutSession,
)
from app.schemas.workout import (
    PlanExerciseRecommendationOut,
    WorkoutPlanCreate,
    WorkoutPlanDayCreate,
    WorkoutPlanDayOut,
    WorkoutPlanDayUpdate,
    WorkoutPlanExerciseCreate,
    WorkoutPlanExerciseOut,
    WorkoutPlanExerciseUpdate,
    WorkoutPlanOut,
    WorkoutPlanUpdate,
)

WEIGHT_INCREMENT_KG = 2.5
RPE_FATIGUE_THRESHOLD = 9

router = APIRouter(prefix="/workout-plans", tags=["workout-plans"])


def _get_owned_plan(db: Session, plan_id: int, user: User) -> WorkoutPlan:
    plan = db.get(WorkoutPlan, plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout plan not found")
    return plan


def _get_owned_day(db: Session, plan_id: int, day_id: int, user: User) -> WorkoutPlanDay:
    _get_owned_plan(db, plan_id, user)
    day = db.get(WorkoutPlanDay, day_id)
    if day is None or day.plan_id != plan_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan day not found")
    return day


def _get_owned_plan_exercise(
    db: Session, plan_id: int, day_id: int, plan_exercise_id: int, user: User
) -> WorkoutPlanExercise:
    _get_owned_day(db, plan_id, day_id, user)
    plan_exercise = db.get(WorkoutPlanExercise, plan_exercise_id)
    if plan_exercise is None or plan_exercise.plan_day_id != day_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan exercise not found")
    return plan_exercise


@router.post("", response_model=WorkoutPlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: WorkoutPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = WorkoutPlan(**payload.model_dump(), user_id=current_user.id)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("", response_model=list[WorkoutPlanOut])
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(WorkoutPlan)
        .filter(WorkoutPlan.user_id == current_user.id)
        .order_by(WorkoutPlan.created_at.desc())
        .all()
    )


@router.get("/{plan_id}", response_model=WorkoutPlanOut)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_plan(db, plan_id, current_user)


@router.patch("/{plan_id}", response_model=WorkoutPlanOut)
def update_plan(
    plan_id: int,
    payload: WorkoutPlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = _get_owned_plan(db, plan_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    db.refresh(plan)
    return plan


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
    "/{plan_id}/days", response_model=WorkoutPlanDayOut, status_code=status.HTTP_201_CREATED
)
def create_plan_day(
    plan_id: int,
    payload: WorkoutPlanDayCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_plan(db, plan_id, current_user)
    day = WorkoutPlanDay(**payload.model_dump(), plan_id=plan_id)
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


@router.patch("/{plan_id}/days/{day_id}", response_model=WorkoutPlanDayOut)
def update_plan_day(
    plan_id: int,
    day_id: int,
    payload: WorkoutPlanDayUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = _get_owned_day(db, plan_id, day_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(day, field, value)
    db.commit()
    db.refresh(day)
    return day


@router.delete("/{plan_id}/days/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan_day(
    plan_id: int,
    day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    day = _get_owned_day(db, plan_id, day_id, current_user)
    db.delete(day)
    db.commit()


@router.post(
    "/{plan_id}/days/{day_id}/exercises",
    response_model=WorkoutPlanExerciseOut,
    status_code=status.HTTP_201_CREATED,
)
def add_plan_exercise(
    plan_id: int,
    day_id: int,
    payload: WorkoutPlanExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_day(db, plan_id, day_id, current_user)
    if db.get(Exercise, payload.exercise_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    plan_exercise = WorkoutPlanExercise(**payload.model_dump(), plan_day_id=day_id)
    db.add(plan_exercise)
    db.commit()
    db.refresh(plan_exercise)
    return plan_exercise


@router.patch(
    "/{plan_id}/days/{day_id}/exercises/{plan_exercise_id}",
    response_model=WorkoutPlanExerciseOut,
)
def update_plan_exercise(
    plan_id: int,
    day_id: int,
    plan_exercise_id: int,
    payload: WorkoutPlanExerciseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan_exercise = _get_owned_plan_exercise(db, plan_id, day_id, plan_exercise_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan_exercise, field, value)
    db.commit()
    db.refresh(plan_exercise)
    return plan_exercise


@router.delete(
    "/{plan_id}/days/{day_id}/exercises/{plan_exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_plan_exercise(
    plan_id: int,
    day_id: int,
    plan_exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan_exercise = _get_owned_plan_exercise(db, plan_id, day_id, plan_exercise_id, current_user)
    db.delete(plan_exercise)
    db.commit()


def _find_top_set(db: Session, user_id: int, day_id: int, exercise_id: int):
    """Most recent completed session's top (highest-weight) non-warmup set
    for this exercise, scoped to sessions started against this plan day."""
    latest_session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.plan_day_id == day_id,
            WorkoutSession.ended_at.isnot(None),
        )
        # started_at is a MySQL DATETIME with second precision, so sessions
        # created within the same second tie; id (autoincrement) is the
        # tiebreaker for actual recency.
        .order_by(WorkoutSession.started_at.desc(), WorkoutSession.id.desc())
        .first()
    )
    if latest_session is None:
        return None, None

    top_set = (
        db.query(SessionSet)
        .filter(
            SessionSet.session_id == latest_session.id,
            SessionSet.exercise_id == exercise_id,
            SessionSet.is_warmup.is_(False),
        )
        .order_by(SessionSet.weight_kg.desc(), SessionSet.set_order.asc())
        .first()
    )
    if top_set is None:
        return None, None
    return latest_session, top_set


def _recommend(
    plan_exercise: WorkoutPlanExercise, session: WorkoutSession | None, top_set: SessionSet | None
) -> PlanExerciseRecommendationOut:
    target_min = plan_exercise.target_reps_min
    target_max = plan_exercise.target_reps_max

    if top_set is None:
        return PlanExerciseRecommendationOut(
            plan_exercise_id=plan_exercise.id,
            exercise_id=plan_exercise.exercise_id,
            target_reps_min=target_min,
            target_reps_max=target_max,
            rationale="No prior session logged for this exercise on this plan day yet.",
        )

    reps = top_set.reps
    rpe = float(top_set.rpe) if top_set.rpe is not None else None
    weight = float(top_set.weight_kg)

    if target_max is not None and reps >= target_max:
        if rpe is not None and rpe >= RPE_FATIGUE_THRESHOLD:
            suggested, rationale = weight, "Hit rep target but near failure (RPE ≥ 9) — repeat weight."
        else:
            suggested = weight + WEIGHT_INCREMENT_KG
            rationale = "Hit top of rep range comfortably — add 2.5kg."
    elif target_min is not None and reps < target_min:
        suggested, rationale = weight, "Missed rep target — repeat weight and focus on reps."
    elif target_min is None and target_max is None:
        if rpe is not None and rpe <= 8:
            suggested = weight + WEIGHT_INCREMENT_KG
            rationale = "No rep target set; RPE was low — add 2.5kg."
        else:
            suggested, rationale = weight, "No rep target set; hold weight."
    else:
        suggested = weight
        rationale = "Within target range — repeat weight, aim for more reps before increasing."

    return PlanExerciseRecommendationOut(
        plan_exercise_id=plan_exercise.id,
        exercise_id=plan_exercise.exercise_id,
        target_reps_min=target_min,
        target_reps_max=target_max,
        last_session_id=session.id,
        last_weight_kg=weight,
        last_reps=reps,
        last_rpe=rpe,
        suggested_weight_kg=suggested,
        rationale=rationale,
    )


@router.get(
    "/{plan_id}/days/{day_id}/recommendations",
    response_model=list[PlanExerciseRecommendationOut],
)
def get_day_recommendations(
    plan_id: int,
    day_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Suggested next weight per exercise on this plan day, based on the
    most recent completed session logged against it."""
    day = _get_owned_day(db, plan_id, day_id, current_user)
    recommendations = []
    for plan_exercise in day.plan_exercises:
        session, top_set = _find_top_set(db, current_user.id, day_id, plan_exercise.exercise_id)
        recommendations.append(_recommend(plan_exercise, session, top_set))
    return recommendations
