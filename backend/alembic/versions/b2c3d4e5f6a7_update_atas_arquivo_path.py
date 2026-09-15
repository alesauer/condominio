"""update atas column arquivo_url to arquivo_path

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-15 09:35:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Renomeia arquivo_url para arquivo_path se existir
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atas' AND column_name='arquivo_url') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atas' AND column_name='arquivo_path') THEN
            ALTER TABLE atas RENAME COLUMN arquivo_url TO arquivo_path;
        END IF;
    END $$;
    """)

    # 2. Garante que a coluna arquivo_path existe
    op.execute("ALTER TABLE atas ADD COLUMN IF NOT EXISTS arquivo_path VARCHAR(500);")


def downgrade() -> None:
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atas' AND column_name='arquivo_path') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atas' AND column_name='arquivo_url') THEN
            ALTER TABLE atas RENAME COLUMN arquivo_path TO arquivo_url;
        END IF;
    END $$;
    """)
