"""update agua rateio precision for fracao ideal

Revision ID: 5e6f7a8b9c0d
Revises: 4c5d6e7f8a9b
Create Date: 2026-09-10 13:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5e6f7a8b9c0d'
down_revision = '4c5d6e7f8a9b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'agua_rateio_apartamentos',
        'peso',
        existing_type=sa.Numeric(precision=5, scale=2),
        type_=sa.Numeric(precision=8, scale=4),
        existing_nullable=False
    )
    op.alter_column(
        'agua_rateio_apartamentos',
        'soma_pesos',
        existing_type=sa.Numeric(precision=10, scale=2),
        type_=sa.Numeric(precision=10, scale=4),
        existing_nullable=False
    )


def downgrade() -> None:
    op.alter_column(
        'agua_rateio_apartamentos',
        'soma_pesos',
        existing_type=sa.Numeric(precision=10, scale=4),
        type_=sa.Numeric(precision=10, scale=2),
        existing_nullable=False
    )
    op.alter_column(
        'agua_rateio_apartamentos',
        'peso',
        existing_type=sa.Numeric(precision=8, scale=4),
        type_=sa.Numeric(precision=5, scale=2),
        existing_nullable=False
    )
