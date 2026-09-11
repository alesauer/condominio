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
    op.execute("""
        CREATE TABLE IF NOT EXISTS troca_gas_config (
            id UUID PRIMARY KEY,
            competencia DATE,
            ultima_troca VARCHAR(50),
            previsao_proxima_troca VARCHAR(50),
            observacao TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_troca_gas_config_competencia ON troca_gas_config (competencia);")


def downgrade() -> None:
    op.drop_table('troca_gas_config')
