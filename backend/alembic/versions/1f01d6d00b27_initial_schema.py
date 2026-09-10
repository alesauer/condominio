"""Initial schema creation

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-09-10 10:30:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1f01d6d00b27'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. usuarios
    op.create_table(
        'usuarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('senha_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.Enum('admin', 'sindico', 'morador', 'proprietario', name='roleusuario'), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_usuarios_email', 'usuarios', ['email'], unique=True)

    # 2. proprietarios
    op.create_table(
        'proprietarios',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('cpf', sa.String(length=14), nullable=False),
        sa.Column('telefone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_proprietarios_cpf', 'proprietarios', ['cpf'], unique=True)

    # 3. moradores
    op.create_table(
        'moradores',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('cpf', sa.String(length=14), nullable=True),
        sa.Column('telefone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('veiculo', sa.String(length=50), nullable=True),
        sa.Column('tipo', sa.Enum('morador', 'inquilino', 'dependente', name='tipomorador'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 4. apartamentos
    op.create_table(
        'apartamentos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('numero', sa.String(length=20), nullable=False),
        sa.Column('bloco', sa.String(length=20), nullable=True),
        sa.Column('tipo', sa.Enum('padrao', 'area_privativa', 'cobertura', name='tipoapartamento'), nullable=False),
        sa.Column('fracao_ideal', sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column('metragem', sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column('vaga_demarcada', sa.String(length=50), nullable=True),
        sa.Column('status', sa.Enum('ocupado', 'vazio', 'alugado', name='statusapartamento'), nullable=False),
        sa.Column('proprietario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('proprietarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_apartamentos_proprietario_id', 'apartamentos', ['proprietario_id'], unique=False)

    # 5. apartamento_moradores
    op.create_table(
        'apartamento_moradores',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('apartamento_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('apartamentos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('morador_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('moradores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('principal', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('data_inicio', sa.Date(), nullable=False),
        sa.Column('data_fim', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_apartamento_moradores_apartamento_id', 'apartamento_moradores', ['apartamento_id'], unique=False)
    op.create_index('ix_apartamento_moradores_morador_id', 'apartamento_moradores', ['morador_id'], unique=False)

    # 6. receitas
    op.create_table(
        'receitas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('descricao', sa.String(length=500), nullable=False),
        sa.Column('tipo', sa.Enum('condominio', 'fundo_reserva', 'taxa_extra', name='tiporeceita'), nullable=False),
        sa.Column('categoria', sa.String(length=100), nullable=True),
        sa.Column('competencia', sa.Date(), nullable=False),
        sa.Column('vencimento', sa.Date(), nullable=True),
        sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.Enum('pendente', 'pago', 'atrasado', 'cancelado', name='statusfinanceiro'), nullable=False),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('data_recebimento', sa.Date(), nullable=True),
        sa.Column('apartamento_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('apartamentos.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_receitas_competencia', 'receitas', ['competencia'], unique=False)
    op.create_index('ix_receitas_status', 'receitas', ['status'], unique=False)

    # 7. despesas
    op.create_table(
        'despesas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('descricao', sa.String(length=500), nullable=False),
        sa.Column('tipo', sa.Enum('ordinaria', 'extraordinaria', name='tipodespesa'), nullable=False),
        sa.Column('categoria', sa.String(length=100), nullable=True),
        sa.Column('competencia', sa.Date(), nullable=False),
        sa.Column('vencimento', sa.Date(), nullable=False),
        sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('status', sa.Enum('pendente', 'pago', 'atrasado', 'cancelado', name='statusfinanceiro', create_type=False), nullable=False),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('comprovante_url', sa.String(length=500), nullable=True),
        sa.Column('parcelamento', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('total_parcelas', sa.Integer(), nullable=True),
        sa.Column('data_pagamento', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_despesas_competencia', 'despesas', ['competencia'], unique=False)
    op.create_index('ix_despesas_status', 'despesas', ['status'], unique=False)

    # 8. despesa_parcelas
    op.create_table(
        'despesa_parcelas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('despesa_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('despesas.id', ondelete='CASCADE'), nullable=False),
        sa.Column('numero_parcela', sa.Integer(), nullable=False),
        sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('competencia', sa.Date(), nullable=False),
        sa.Column('vencimento', sa.Date(), nullable=True),
        sa.Column('status', sa.Enum('pendente', 'pago', 'atrasado', 'cancelado', name='statusfinanceiro', create_type=False), nullable=False),
        sa.Column('data_pagamento', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_despesa_parcelas_despesa_id', 'despesa_parcelas', ['despesa_id'], unique=False)
    op.create_index('ix_despesa_parcelas_competencia', 'despesa_parcelas', ['competencia'], unique=False)

    # 9. cobrancas
    op.create_table(
        'cobrancas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('apartamento_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('apartamentos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('descricao', sa.String(length=500), nullable=False),
        sa.Column('competencia', sa.Date(), nullable=False),
        sa.Column('vencimento', sa.Date(), nullable=False),
        sa.Column('valor', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('multa', sa.Numeric(precision=12, scale=2), server_default='0'),
        sa.Column('juros', sa.Numeric(precision=12, scale=2), server_default='0'),
        sa.Column('valor_total', sa.Numeric(precision=12, scale=2), nullable=False, server_default='0'),
        sa.Column('data_pagamento', sa.Date(), nullable=True),
        sa.Column('status', sa.Enum('pendente', 'pago', 'atrasado', 'cancelado', name='statusfinanceiro', create_type=False), nullable=False),
        sa.Column('receita_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('receitas.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_cobrancas_apartamento_id', 'cobrancas', ['apartamento_id'], unique=False)
    op.create_index('ix_cobrancas_competencia', 'cobrancas', ['competencia'], unique=False)
    op.create_index('ix_cobrancas_vencimento', 'cobrancas', ['vencimento'], unique=False)
    op.create_index('ix_cobrancas_status', 'cobrancas', ['status'], unique=False)

    # 10. leituras_gas
    op.create_table(
        'leituras_gas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('apartamento_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('apartamentos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mes_referencia', sa.Date(), nullable=False),
        sa.Column('data_leitura', sa.Date(), nullable=False),
        sa.Column('leitura_anterior', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('leitura_atual', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('consumo', sa.Numeric(precision=10, scale=3), nullable=False),
        sa.Column('valor_m3', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('valor_total', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('lote', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_leituras_gas_apartamento_id', 'leituras_gas', ['apartamento_id'], unique=False)
    op.create_index('ix_leituras_gas_mes_referencia', 'leituras_gas', ['mes_referencia'], unique=False)

    # 11. agua_rateios
    op.create_table(
        'agua_rateios',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('competencia', sa.Date(), nullable=False),
        sa.Column('valor_total', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agua_rateios_competencia', 'agua_rateios', ['competencia'], unique=True)

    # 12. agua_rateio_apartamentos
    op.create_table(
        'agua_rateio_apartamentos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rateio_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('agua_rateios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('apartamento_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('apartamentos.id', ondelete='CASCADE'), nullable=False),
        sa.Column('peso', sa.Numeric(precision=4, scale=2), nullable=False),
        sa.Column('soma_pesos', sa.Numeric(precision=6, scale=2), nullable=False),
        sa.Column('valor_calculado', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_agua_rateio_apartamentos_rateio_id', 'agua_rateio_apartamentos', ['rateio_id'], unique=False)
    op.create_index('ix_agua_rateio_apartamentos_apartamento_id', 'agua_rateio_apartamentos', ['apartamento_id'], unique=False)

    # 13. avisos
    op.create_table(
        'avisos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('titulo', sa.String(length=255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('prioridade', sa.Enum('baixa', 'media', 'alta', 'urgente', name='prioridadeaviso'), nullable=False),
        sa.Column('data_publicacao', sa.Date(), nullable=False),
        sa.Column('enviar_email', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 14. assembleias
    op.create_table(
        'assembleias',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('data', sa.Date(), nullable=False),
        sa.Column('hora_inicio', sa.Time(), nullable=True),
        sa.Column('hora_fim', sa.Time(), nullable=True),
        sa.Column('local', sa.String(length=255), nullable=True),
        sa.Column('titulo', sa.String(length=255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 15. pautas
    op.create_table(
        'pautas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assembleia_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assembleias.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_pautas_assembleia_id', 'pautas', ['assembleia_id'], unique=False)

    # 16. atas
    op.create_table(
        'atas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('assembleia_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assembleias.id', ondelete='CASCADE'), nullable=False),
        sa.Column('conteudo', sa.Text(), nullable=True),
        sa.Column('arquivo_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_atas_assembleia_id', 'atas', ['assembleia_id'], unique=True)

    # 17. documentos
    op.create_table(
        'documentos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('categoria', sa.Enum('atas', 'boletos', 'comprovantes', 'contratos', 'convencao', 'outros', name='categoriadocumento'), nullable=False),
        sa.Column('caminho_arquivo', sa.String(length=500), nullable=False),
        sa.Column('tamanho_bytes', sa.Integer(), nullable=True),
        sa.Column('tipo_mime', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 18. anexos
    op.create_table(
        'anexos',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('entidade_tipo', sa.String(length=50), nullable=False),
        sa.Column('entidade_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome_arquivo', sa.String(length=255), nullable=False),
        sa.Column('caminho_arquivo', sa.String(length=500), nullable=False),
        sa.Column('tamanho_bytes', sa.Integer(), nullable=True),
        sa.Column('tipo_mime', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_anexos_entidade_tipo_id', 'anexos', ['entidade_tipo', 'entidade_id'], unique=False)

    # 19. config_inadimplencia
    op.create_table(
        'config_inadimplencia',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('percentual_multa', sa.Numeric(precision=5, scale=2), nullable=False, server_default='2.00'),
        sa.Column('percentual_juros_mes', sa.Numeric(precision=5, scale=2), nullable=False, server_default='1.00'),
        sa.Column('dias_tolerancia', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    # 20. auditoria
    op.create_table(
        'auditoria',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True),
        sa.Column('usuario_nome', sa.String(length=255), nullable=True),
        sa.Column('acao', sa.String(length=50), nullable=False),
        sa.Column('entidade_tipo', sa.String(length=50), nullable=False),
        sa.Column('entidade_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('dados_anteriores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('dados_novos', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_origem', sa.String(length=45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_auditoria_usuario_id', 'auditoria', ['usuario_id'], unique=False)
    op.create_index('ix_auditoria_created_at', 'auditoria', ['created_at'], unique=False)

    # 21. tokens_refresh
    op.create_table(
        'tokens_refresh',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('usuario_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(length=500), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_index('ix_tokens_refresh_usuario_id', 'tokens_refresh', ['usuario_id'], unique=False)
    op.create_index('ix_tokens_refresh_token', 'tokens_refresh', ['token'], unique=True)


def downgrade() -> None:
    op.drop_table('tokens_refresh')
    op.drop_table('auditoria')
    op.drop_table('config_inadimplencia')
    op.drop_table('anexos')
    op.drop_table('documentos')
    op.drop_table('atas')
    op.drop_table('pautas')
    op.drop_table('assembleias')
    op.drop_table('avisos')
    op.drop_table('agua_rateio_apartamentos')
    op.drop_table('agua_rateios')
    op.drop_table('leituras_gas')
    op.drop_table('cobrancas')
    op.drop_table('despesa_parcelas')
    op.drop_table('despesas')
    op.drop_table('receitas')
    op.drop_table('apartamento_moradores')
    op.drop_table('apartamentos')
    op.drop_table('moradores')
    op.drop_table('proprietarios')
    op.drop_table('usuarios')
