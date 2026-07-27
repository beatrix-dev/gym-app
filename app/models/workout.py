from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    DECIMAL,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    name = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    forked_from_plan_id = Column(BigInteger, ForeignKey("workout_plans.id"), nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="workout_plans")
    days = relationship(
        "WorkoutPlanDay",
        back_populates="plan",
        cascade="all, delete-orphan",
        order_by="WorkoutPlanDay.day_order",
    )
    # self-referential: the plan this one was copied from, if any
    forked_from = relationship("WorkoutPlan", remote_side=[id])


class WorkoutPlanDay(Base):
    __tablename__ = "workout_plan_days"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_id = Column(BigInteger, ForeignKey("workout_plans.id"), nullable=False)
    day_order = Column(SmallInteger, nullable=False)
    label = Column(String(100))

    plan = relationship("WorkoutPlan", back_populates="days")
    plan_exercises = relationship(
        "WorkoutPlanExercise",
        back_populates="plan_day",
        cascade="all, delete-orphan",
        order_by="WorkoutPlanExercise.exercise_order",
    )
    sessions = relationship("WorkoutSession", back_populates="plan_day")


class WorkoutPlanExercise(Base):
    __tablename__ = "workout_plan_exercises"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_day_id = Column(BigInteger, ForeignKey("workout_plan_days.id"), nullable=False)
    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    exercise_order = Column(SmallInteger)
    target_sets = Column(SmallInteger)
    target_reps_min = Column(SmallInteger)
    target_reps_max = Column(SmallInteger)

    plan_day = relationship("WorkoutPlanDay", back_populates="plan_exercises")
    exercise = relationship("Exercise", back_populates="plan_exercises")


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    __table_args__ = (
        Index("idx_user_session_date", "user_id", "started_at"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    plan_day_id = Column(BigInteger, ForeignKey("workout_plan_days.id"), nullable=True)
    started_at = Column(DateTime, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    notes = Column(Text)

    user = relationship("User", back_populates="workout_sessions")
    plan_day = relationship("WorkoutPlanDay", back_populates="sessions")
    sets = relationship(
        "SessionSet",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="SessionSet.set_order",
    )


class SessionSet(Base):
    __tablename__ = "session_sets"
    __table_args__ = (
        Index("idx_exercise_lookup", "exercise_id", "session_id"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(BigInteger, ForeignKey("workout_sessions.id"), nullable=False)
    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    set_order = Column(SmallInteger)
    weight_kg = Column(DECIMAL(6, 2), nullable=False)
    reps = Column(SmallInteger, nullable=False)
    rpe = Column(DECIMAL(3, 1), nullable=True)
    is_warmup = Column(Boolean, default=False)

    session = relationship("WorkoutSession", back_populates="sets")
    exercise = relationship("Exercise", back_populates="session_sets")
