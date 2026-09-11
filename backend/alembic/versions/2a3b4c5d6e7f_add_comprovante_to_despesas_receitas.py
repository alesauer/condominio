"""add comprovante to despesas and receitas

Revision ID: 2a3b4c5d6e7f
Revises: 1f01d6d00b27
Create Date: 2026-09-10 12:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2a3b4c5d6e7f'
down_revision = '1f01d6d00b27'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add comprovante_url and comprovante_nome to despesas
    op.execute("ALTER TABLE despesas ADD COLUMN IF NOT EXISTS comprovante_url VARCHAR(500)")
    op.execute("ALTER TABLE despesas ADD COLUMN IF NOT EXISTS comprovante_nome VARCHAR(255)")

    # Add comprovante_url and comprovante_nome to receitas
    op.execute("ALTER TABLE receitas ADD COLUMN IF NOT EXISTS comprovante_url VARCHAR(500)")
    op.execute("ALTER TABLE receitas ADD COLUMN IF NOT EXISTS comprovante_nome VARCHAR(255)")


def downgrade() -> None:
    op.drop_column('receitas', 'comprovante_nome')
    op.drop_column('receitas', 'comprovante_url')
    op.drop_column('despesas', 'comprovante_nome')
    op.drop_column('despesas', 'comprovante_url')
