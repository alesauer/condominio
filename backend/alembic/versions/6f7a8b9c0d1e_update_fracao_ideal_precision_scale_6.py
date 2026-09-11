"""update fracao ideal precision to scale 6

Revision ID: 6f7a8b9c0d1e
Revises: 5e6f7a8b9c0d
Create Date: 2026-09-11 08:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6f7a8b9c0d1e'
down_revision = '5e6f7a8b9c0d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        'apartamentos',
        'fracao_ideal',
        existing_type=sa.Numeric(precision=8, scale=4),
        type_=sa.Numeric(precision=10, scale=6),
        existing_nullable=True
    )
    op.alter_column(
        'agua_rateio_apartamentos',
        'peso',
        existing_type=sa.Numeric(precision=8, scale=4),
        type_=sa.Numeric(precision=10, scale=6),
        existing_nullable=False
    )
    op.alter_column(
        'agua_rateio_apartamentos',
        'soma_pesos',
        existing_type=sa.Numeric(precision=10, scale=4),
        type_=sa.Numeric(precision=12, scale=6),
        existing_nullable=False
    )


def downgrade() -> None:
    op.alter_column(
        'agua_rateio_apartamentos',
        'soma_pesos',
        existing_type=sa.Numeric(precision=12, scale=6),
        type_=sa.Numeric(precision=10, scale=4),
        existing_nullable=False
    )
    op.alter_column(
        'agua_rateio_apartamentos',
        'peso',
        existing_type=sa.Numeric(precision=10, scale=6),
        type_=sa.Numeric(precision=8, scale=4),
        existing_nullable=False
    )
    op.alter_column(
        'apartamentos',
        'fracao_ideal',
        existing_type=sa.Numeric(precision=10, scale=6),
        type_=sa.Numeric(precision=8, scale=4),
        existing_nullable=True
    )
