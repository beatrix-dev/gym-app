from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.exercise import Exercise
from app.models.user import User
from app.models.workout import SessionSet, WorkoutPlan, WorkoutPlanDay, WorkoutSession
from app.schemas.workout import (
    SessionSetCreate,
    SessionSetOut,
    SessionSetUpdate,
    WorkoutSessionCreate,
    WorkoutSessionOut,
    WorkoutSessionUpdate,
)

router = APIRouter(prefix="/workout-sessions", tags=["workout-sessions"])


def _get_owned_session(db: Session, session_id: int, user: User) -> WorkoutSession:
    session = db.get(WorkoutSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workout session not found")
    return session


def _get_owned_set(db: Session, session_id: int, set_id: int, user: User) -> SessionSet:
    _get_owned_session(db, session_id, user)
    session_set = db.get(SessionSet, set_id)
    if session_set is None or session_set.session_id != session_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Set not found")
    return session_set


@router.post("", response_model=WorkoutSessionOut, status_code=status.HTTP_201_CREATED)
def start_session(
    payload: WorkoutSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.plan_day_id is not None:
        owned_day = (
            db.query(WorkoutPlanDay)
            .join(WorkoutPlan, WorkoutPlanDay.plan_id == WorkoutPlan.id)
            .filter(WorkoutPlanDay.id == payload.plan_day_id, WorkoutPlan.user_id == current_user.id)
            .first()
        )
        if owned_day is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan day not found")

    started_at = payload.started_at or datetime.now(timezone.utc)
    if started_at.tzinfo is not None:
        # started_at maps to a naive MySQL DATETIME column; normalize to naive UTC.
        started_at = started_at.astimezone(timezone.utc).replace(tzinfo=None)

    session = WorkoutSession(
        user_id=current_user.id,
        plan_day_id=payload.plan_day_id,
        started_at=started_at,
        notes=payload.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=list[WorkoutSessionOut])
def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.started_at.desc())
        .all()
    )


@router.get("/{session_id}", response_model=WorkoutSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_session(db, session_id, current_user)


@router.patch("/{session_id}", response_model=WorkoutSessionOut)
def update_session(
    session_id: int,
    payload: WorkoutSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Used to finish a session (set ended_at) or edit its notes."""
    session = _get_owned_session(db, session_id, current_user)
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("ended_at") is not None and updates["ended_at"].tzinfo is not None:
        updates["ended_at"] = updates["ended_at"].astimezone(timezone.utc).replace(tzinfo=None)
    for field, value in updates.items():
        setattr(session, field, value)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_owned_session(db, session_id, current_user)
    db.delete(session)
    db.commit()


@router.post(
    "/{session_id}/sets", response_model=SessionSetOut, status_code=status.HTTP_201_CREATED
)
def log_set(
    session_id: int,
    payload: SessionSetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_owned_session(db, session_id, current_user)
    if db.get(Exercise, payload.exercise_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exercise not found")

    session_set = SessionSet(**payload.model_dump(), session_id=session_id)
    db.add(session_set)
    db.commit()
    db.refresh(session_set)
    return session_set


@router.patch("/{session_id}/sets/{set_id}", response_model=SessionSetOut)
def update_set(
    session_id: int,
    set_id: int,
    payload: SessionSetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_set = _get_owned_set(db, session_id, set_id, current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(session_set, field, value)
    db.commit()
    db.refresh(session_set)
    return session_set


@router.delete("/{session_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(
    session_id: int,
    set_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_set = _get_owned_set(db, session_id, set_id, current_user)
    db.delete(session_set)
    db.commit()
