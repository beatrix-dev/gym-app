"""add food units

Revision ID: c3f9a1d2b7e4
Revises: 1a1c401f5549
Create Date: 2026-07-30 08:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3f9a1d2b7e4'
down_revision: Union[str, Sequence[str], None] = '1a1c401f5549'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FOOD_UNIT_VALUES = ('grams', 'ml', 'tbsp', 'tsp', 'cup', 'piece')


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'food_item_units',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('food_item_id', sa.BigInteger(), sa.ForeignKey('food_items.id'), nullable=False),
        sa.Column('unit', sa.Enum(*FOOD_UNIT_VALUES, name='foodunit'), nullable=False),
        sa.Column('grams_per_unit', sa.DECIMAL(7, 2), nullable=False),
        sa.UniqueConstraint('food_item_id', 'unit', name='uq_food_item_unit'),
    )

    op.add_column(
        'meal_plan_entries',
        sa.Column(
            'unit',
            sa.Enum(*FOOD_UNIT_VALUES, name='foodunit'),
            nullable=False,
            server_default='grams',
        ),
    )
    op.alter_column(
        'meal_plan_entries',
        'quantity_grams',
        new_column_name='quantity',
        existing_type=sa.DECIMAL(6, 2),
        type_=sa.DECIMAL(7, 2),
        existing_nullable=False,
    )
    op.alter_column('meal_plan_entries', 'unit', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column(
        'meal_plan_entries',
        'quantity',
        new_column_name='quantity_grams',
        existing_type=sa.DECIMAL(7, 2),
        type_=sa.DECIMAL(6, 2),
        existing_nullable=False,
    )
    op.drop_column('meal_plan_entries', 'unit')
    op.drop_table('food_item_units')
