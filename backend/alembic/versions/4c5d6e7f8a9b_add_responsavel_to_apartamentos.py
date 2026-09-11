"""add responsavel_id to apartamentos

Revision ID: 4c5d6e7f8a9b
Revises: 3b4c5d6e7f8a
Create Date: 2026-09-10 13:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '4c5d6e7f8a9b'
down_revision = '3b4c5d6e7f8a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add responsavel_id column safely
    op.execute("ALTER TABLE apartamentos ADD COLUMN IF NOT EXISTS responsavel_id UUID")

    # Create foreign key referencing moradores safely
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'apartamentos_responsavel_id_fkey'
            ) THEN
                ALTER TABLE apartamentos ADD CONSTRAINT apartamentos_responsavel_id_fkey 
                FOREIGN KEY (responsavel_id) REFERENCES moradores(id) ON DELETE SET NULL;
            END IF;
        END $$;
    """)

    # Create index safely
    op.execute("CREATE INDEX IF NOT EXISTS ix_apartamentos_responsavel_id ON apartamentos (responsavel_id)")

    # Initialize responsavel_id with proprietario_id if available
    op.execute("""
        UPDATE apartamentos
        SET responsavel_id = proprietario_id
        WHERE responsavel_id IS NULL AND proprietario_id IS NOT NULL;
    """)


def downgrade() -> None:
    op.drop_index('ix_apartamentos_responsavel_id', table_name='apartamentos')
    op.drop_constraint('apartamentos_responsavel_id_fkey', 'apartamentos', type_='foreignkey')
    op.drop_column('apartamentos', 'responsavel_id')
