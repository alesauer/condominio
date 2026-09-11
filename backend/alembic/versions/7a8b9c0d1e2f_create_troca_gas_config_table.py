"""create troca_gas_config table

Revision ID: 7a8b9c0d1e2f
Revises: 6f7a8b9c0d1e
Create Date: 2026-09-11 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '7a8b9c0d1e2f'
down_revision = '6f7a8b9c0d1e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'troca_gas_config',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('competencia', sa.Date(), nullable=True, index=True),
        sa.Column('ultima_troca', sa.String(length=50), nullable=True),
        sa.Column('previsao_proxima_troca', sa.String(length=50), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('troca_gas_config')
