"""cognito users

Revision ID: d18580afbf50
Revises: c3f9a1d2b7e4
Create Date: 2026-11-10 22:10:51.983739

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd18580afbf50'
down_revision: Union[str, Sequence[str], None] = 'c3f9a1d2b7e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Assumes an empty `users` table (fresh database, per the AWS migration design):
    # existing rows would have no cognito_sub to satisfy NOT NULL.
    op.drop_column('users', 'password_hash')
    op.add_column('users', sa.Column('cognito_sub', sa.String(64), nullable=False))
    op.create_index('ix_users_cognito_sub', 'users', ['cognito_sub'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_users_cognito_sub', table_name='users')
    op.drop_column('users', 'cognito_sub')
    op.add_column('users', sa.Column('password_hash', sa.String(255), nullable=False, server_default=''))
