import enum

from sqlalchemy import BigInteger, Boolean, Column, Enum, ForeignKey, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class MuscleGroup(str, enum.Enum):
    chest = "chest"
    back = "back"
    legs = "legs"
    shoulders = "shoulders"
    arms = "arms"
    core = "core"
    full_body = "full_body"


class Equipment(str, enum.Enum):
    barbell = "barbell"
    dumbbell = "dumbbell"
    machine = "machine"
    cable = "cable"
    bodyweight = "bodyweight"
    other = "other"


class ExerciseCategory(str, enum.Enum):
    compound = "compound"
    isolation = "isolation"


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    muscle_group = Column(Enum(MuscleGroup))
    equipment = Column(Enum(Equipment))
    category = Column(Enum(ExerciseCategory))
    is_custom = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    created_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)

    created_by = relationship("User", back_populates="exercises")
    plan_exercises = relationship("WorkoutPlanExercise", back_populates="exercise")
    session_sets = relationship("SessionSet", back_populates="exercise")
