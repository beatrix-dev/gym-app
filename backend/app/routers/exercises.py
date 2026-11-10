from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import SessionSet, WorkoutSession
from app.schemas.exercise import ExerciseCreate, ExerciseOut, PersonalRecordOut

router = APIRouter(prefix="/exercises", tags=["exercises"])


def _visible_to(user: User):
    """An exercise is visible if it's global/seeded, public, or owned by the caller."""
    return or_(
        Exercise.created_by_user_id.is_(None),
        Exercise.is_public.is_(True),
        Exercise.created_by_user_id == user.id,
    )


@router.post("", response_model=ExerciseOut, status_code=status.HTTP_201_CREATED)
def create_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exercise = Exercise(
        **payload.model_dump(),
        is_custom=True,
        created_by_user_id=current_user.id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Exercise).filter(_visible_to(current_user)).order_by(Exercise.name).all()


def _epley_e1rm(weight_kg, reps: int) -> float:
    """Estimated 1RM. A true single (reps==1) is used as-is rather than
    inflated by the formula, since Epley is only an approximation for reps>1."""
    weight_kg = float(weight_kg)
    if reps <= 1:
        return round(weight_kg, 2)
    return round(weight_kg * (1 + reps / 30), 2)


def _best_sets_query(db: Session, user_id: int, exercise_id: int | None = None):
    query = (
        db.query(SessionSet, WorkoutSession)
        .join(WorkoutSession, SessionSet.session_id == WorkoutSession.id)
        .filter(WorkoutSession.user_id == user_id, SessionSet.is_warmup.is_(False))
    )
    if exercise_id is not None:
        query = query.filter(SessionSet.exercise_id == exercise_id)
    return query.all()


def _to_pr_out(session_set: SessionSet, session: WorkoutSession) -> PersonalRecordOut:
    return PersonalRecordOut(
        exercise_id=session_set.exercise_id,
        session_id=session.id,
        weight_kg=float(session_set.weight_kg),
        reps=session_set.reps,
        rpe=float(session_set.rpe) if session_set.rpe is not None else None,
        estimated_1rm=_epley_e1rm(session_set.weight_kg, session_set.reps),
        achieved_at=session.started_at,
    )


@router.get("/prs", response_model=list[PersonalRecordOut])
def list_personal_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Best estimated-1RM set per exercise, across all of the caller's logged sessions."""
    rows = _best_sets_query(db, current_user.id)

    best_by_exercise: dict[int, tuple[SessionSet, WorkoutSession]] = {}
    for session_set, session in rows:
        e1rm = _epley_e1rm(session_set.weight_kg, session_set.reps)
        current_best = best_by_exercise.get(session_set.exercise_id)
        if current_best is None or e1rm > _epley_e1rm(current_best[0].weight_kg, current_best[0].reps):
            best_by_exercise[session_set.exercise_id] = (session_set, session)

    return [
        _to_pr_out(session_set, session)
        for exercise_id, (session_set, session) in sorted(best_by_exercise.items())
    ]


@router.get("/{exercise_id}/pr", response_model=PersonalRecordOut)
def get_personal_record(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.get(Exercise, exercise_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    rows = _best_sets_query(db, current_user.id, exercise_id)
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No completed sets logged for this exercise yet",
        )

    best_set, best_session = max(rows, key=lambda row: _epley_e1rm(row[0].weight_kg, row[0].reps))
    return _to_pr_out(best_set, best_session)


@router.get("/{exercise_id}", response_model=ExerciseOut)
def get_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exercise = (
        db.query(Exercise)
        .filter(Exercise.id == exercise_id, _visible_to(current_user))
        .first()
    )
    if exercise is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")
    return exercise
