"""add day_of_week to workout_plan_days

Revision ID: 65fad8b338f8
Revises: 46cd47be4b48
Create Date: 2026-07-28 19:15:21.891372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65fad8b338f8'
down_revision: Union[str, Sequence[str], None] = '46cd47be4b48'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'workout_plan_days',
        sa.Column(
            'day_of_week',
            sa.Enum(
                'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
                name='dayofweek',
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('workout_plan_days', 'day_of_week')
