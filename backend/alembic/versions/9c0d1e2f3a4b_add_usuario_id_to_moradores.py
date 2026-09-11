"""add usuario_id to moradores

Revision ID: 9c0d1e2f3a4b
Revises: 8b9c0d1e2f3a
Create Date: 2026-09-11 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9c0d1e2f3a4b'
down_revision = '8b9c0d1e2f3a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE moradores ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;")
    op.execute("ALTER TABLE moradores ADD COLUMN IF NOT EXISTS veiculo VARCHAR(100);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_moradores_usuario_id ON moradores (usuario_id);")


def downgrade() -> None:
    op.execute("ALTER TABLE moradores DROP COLUMN IF EXISTS usuario_id;")
