"""update leituras_gas columns to match models

Revision ID: a1b2c3d4e5f6
Revises: 9c0d1e2f3a4b
Create Date: 2026-09-14 08:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '9c0d1e2f3a4b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Renomeia ou cria coluna competencia
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='mes_referencia') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='competencia') THEN
            ALTER TABLE leituras_gas RENAME COLUMN mes_referencia TO competencia;
        END IF;
    END $$;
    """)
    op.execute("ALTER TABLE leituras_gas ADD COLUMN IF NOT EXISTS competencia DATE;")

    # 2. Renomeia ou cria coluna valor_unitario
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='valor_m3') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='valor_unitario') THEN
            ALTER TABLE leituras_gas RENAME COLUMN valor_m3 TO valor_unitario;
        END IF;
    END $$;
    """)
    op.execute("ALTER TABLE leituras_gas ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(8, 4);")

    # 3. Renomeia ou cria coluna valor_cobrado
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='valor_total') 
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='valor_cobrado') THEN
            ALTER TABLE leituras_gas RENAME COLUMN valor_total TO valor_cobrado;
        END IF;
    END $$;
    """)
    op.execute("ALTER TABLE leituras_gas ADD COLUMN IF NOT EXISTS valor_cobrado NUMERIC(12, 2);")

    # 4. Adiciona observacao
    op.execute("ALTER TABLE leituras_gas ADD COLUMN IF NOT EXISTS observacao TEXT;")

    # 5. Afrouxa constraints não obrigatórias
    op.execute("ALTER TABLE leituras_gas ALTER COLUMN leitura_anterior DROP NOT NULL;")
    op.execute("ALTER TABLE leituras_gas ALTER COLUMN consumo DROP NOT NULL;")
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leituras_gas' AND column_name='data_leitura') THEN
            ALTER TABLE leituras_gas ALTER COLUMN data_leitura DROP NOT NULL;
        END IF;
    END $$;
    """)

    # 6. Cria índice para competencia
    op.execute("CREATE INDEX IF NOT EXISTS ix_leituras_gas_competencia ON leituras_gas (competencia);")


def downgrade() -> None:
    pass
