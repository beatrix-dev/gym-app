"""add category to food_items

Revision ID: 1a1c401f5549
Revises: 65fad8b338f8
Create Date: 2026-07-29 08:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1a1c401f5549'
down_revision: Union[str, Sequence[str], None] = '65fad8b338f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'food_items',
        sa.Column(
            'category',
            sa.Enum(
                'protein', 'dairy', 'grains', 'produce', 'fats_oils', 'other',
                name='foodcategory',
            ),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('food_items', 'category')
