"""add descricao and apartamento_id to documentos table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-15 09:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Adiciona coluna descricao se nao existir
    op.execute("ALTER TABLE documentos ADD COLUMN IF NOT EXISTS descricao TEXT;")

    # 2. Adiciona coluna apartamento_id se nao existir
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documentos' AND column_name='apartamento_id') THEN
            ALTER TABLE documentos ADD COLUMN apartamento_id UUID REFERENCES apartamentos(id) ON DELETE SET NULL;
        END IF;
    END $$;
    """)

    # 3. Amplia tamanho das colunas nome e caminho_arquivo
    op.execute("ALTER TABLE documentos ALTER COLUMN nome TYPE VARCHAR(500);")
    op.execute("ALTER TABLE documentos ALTER COLUMN caminho_arquivo TYPE VARCHAR(1000);")
    op.execute("ALTER TABLE documentos ALTER COLUMN tamanho_bytes TYPE BIGINT;")


def downgrade() -> None:
    op.execute("ALTER TABLE documentos DROP COLUMN IF EXISTS descricao;")
    op.execute("ALTER TABLE documentos DROP COLUMN IF EXISTS apartamento_id;")
