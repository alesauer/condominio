"""unify moradores and proprietarios

Revision ID: 3b4c5d6e7f8a
Revises: 2a3b4c5d6e7f
Create Date: 2026-09-10 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3b4c5d6e7f8a'
down_revision = '2a3b4c5d6e7f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 0. Ensure columns in moradores
    op.execute("ALTER TABLE moradores ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL;")
    op.execute("ALTER TABLE moradores ADD COLUMN IF NOT EXISTS veiculo VARCHAR(100);")

    # 1. Add 'proprietario' to tipomorador enum in PostgreSQL (must commit before use)
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE tipomorador ADD VALUE IF NOT EXISTS 'proprietario'")

    # 2. Drop old foreign key constraint to proprietarios first
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'apartamentos_proprietario_id_fkey'
            ) THEN
                ALTER TABLE apartamentos DROP CONSTRAINT apartamentos_proprietario_id_fkey;
            END IF;
        END $$;
    """)

    # 3. Migrate existing proprietarios into moradores if not already present
    op.execute("""
        INSERT INTO moradores (id, nome, cpf, telefone, email, tipo, created_at, updated_at)
        SELECT 
            p.id, 
            p.nome, 
            p.cpf, 
            p.telefone, 
            p.email, 
            'proprietario'::tipomorador, 
            p.created_at, 
            p.updated_at
        FROM proprietarios p
        WHERE NOT EXISTS (
            SELECT 1 FROM moradores m WHERE m.id = p.id OR (m.cpf IS NOT NULL AND m.cpf = p.cpf)
        );
    """)

    # 4. For any proprietario whose CPF was already in moradores, update apartamentos.proprietario_id to that morador's id
    op.execute("""
        UPDATE apartamentos a
        SET proprietario_id = m.id
        FROM proprietarios p
        JOIN moradores m ON (m.cpf IS NOT NULL AND m.cpf = p.cpf)
        WHERE a.proprietario_id = p.id;
    """)

    # 5. Create new foreign key referencing moradores
    op.create_foreign_key(
        'apartamentos_proprietario_id_fkey',
        'apartamentos',
        'moradores',
        ['proprietario_id'],
        ['id'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('apartamentos_proprietario_id_fkey', 'apartamentos', type_='foreignkey')
    op.create_foreign_key(
        'apartamentos_proprietario_id_fkey',
        'apartamentos',
        'proprietarios',
        ['proprietario_id'],
        ['id'],
        ondelete='SET NULL'
    )
