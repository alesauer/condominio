from datetime import datetime, date
from typing import Optional, List, Union
from uuid import UUID
from pydantic import BaseModel, Field
from app.models.receita import StatusFinanceiro


class CobrancaResponse(BaseModel):
    id: UUID
    apartamento_id: UUID
    apartamento_numero: Optional[str] = None
    apartamento_bloco: Optional[str] = None
    descricao: str
    competencia: date
    vencimento: date
    valor: float
    multa: Optional[float] = 0.0
    juros: Optional[float] = 0.0
    valor_total: float
    data_pagamento: Optional[date] = None
    status: StatusFinanceiro
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DemonstrativoAcaoEventoInput(BaseModel):
    id: Optional[str] = None
    titulo: str
    descricao: str
    data: Optional[date] = None


class CobrancaGerarMensal(BaseModel):
    competencia: date
    vencimento: date
    valor_fundo_reserva: float = Field(default=0.0, ge=0, description="Valor do fundo de reserva por apartamento (opcional)")
    valor_base_condominio: Optional[float] = Field(default=None, description="Alias legado para valor_fundo_reserva")
    incluir_despesas: bool = Field(default=True, description="Somar despesas do mês e ratear")
    incluir_agua: bool = Field(default=True, description="Incluir rateio de água da competência se apurado")
    incluir_gas: bool = Field(default=True, description="Incluir consumo de gás da competência se apurado")
    descricao: Optional[str] = Field(default=None, description="Descrição personalizada do lançamento (opcional)")
    acoes_eventos: Optional[List[DemonstrativoAcaoEventoInput]] = Field(default_factory=list, description="Ações e eventos realizados no mês")


class SalvarAcoesEventosRequest(BaseModel):
    competencia: Union[date, str]
    acoes_eventos: List[DemonstrativoAcaoEventoInput] = Field(default_factory=list)


class CobrancaPreviaApartamento(BaseModel):
    apartamento_id: UUID
    apartamento_numero: str
    apartamento_bloco: Optional[str] = None
    apartamento_tipo: Optional[str] = None
    fracao_ideal: float
    valor_despesas: float = 0.0
    valor_agua: float = 0.0
    valor_gas: float = 0.0
    valor_fundo_reserva: float = 0.0
    valor_base: float = 0.0
    valor_total: float = 0.0
    ja_gerado: bool = False


class CobrancaPreviaResult(BaseModel):
    competencia: date
    vencimento: date
    total_despesas_mes: float = 0.0
    total_agua: float = 0.0
    total_gas: float = 0.0
    total_fundo_reserva: float = 0.0
    total_base: float = 0.0
    total_geral: float = 0.0
    apartamentos: List[CobrancaPreviaApartamento] = []


class CobrancaGerarMensalResult(BaseModel):
    geradas: int
    total_despesas_mes: Optional[float] = 0.0
    total_agua: Optional[float] = 0.0
    total_gas: Optional[float] = 0.0
    total_fundo_reserva: Optional[float] = 0.0
    total_base: Optional[float] = 0.0
    total_valor: float
    competencia: date
    cobrancas: List[CobrancaResponse]


# ── Demonstrativo Mensal (Planilha Fechamento) ──────────────────────

class DemonstrativoApartamentoHeader(BaseModel):
    id: UUID
    numero: str
    bloco: Optional[str] = None
    fracao_ideal: float
    responsavel_nome: str


class DemonstrativoDespesaItem(BaseModel):
    id: Optional[str] = None
    descricao: str
    observacao: Optional[str] = ""
    valor: float
    rateio_por_apto: dict[str, float] = Field(default_factory=dict)


class DemonstrativoFundoReserva(BaseModel):
    descricao: str
    valor_unitario: float
    valor_total: float
    rateio_por_apto: dict[str, float] = Field(default_factory=dict)


class DemonstrativoCobrancaApto(BaseModel):
    apartamento_id: UUID
    apartamento_numero: str
    responsavel_nome: str
    valor_a_pagar: float
    vencimento: date
    status: str
    data_pagamento: Optional[date] = None
    confirmacao_pgto: Optional[str] = ""


class DemonstrativoAcaoEvento(BaseModel):
    id: Optional[str] = None
    titulo: str
    descricao: str
    data: Optional[date] = None


class DemonstrativoFracaoAgua(BaseModel):
    descricao: str
    fracao: float
    percentual_formatado: str


class DemonstrativoTrocaGas(BaseModel):
    ultima_troca: Optional[str] = "08/2026"
    previsao_proxima_troca: Optional[str] = "11/2026"
    observacao: Optional[str] = "Quando necessário, será adquirido novo botijão de gás no valor de R$ 399,00, retirando do fundo e cobrado mensalmente das unidades consumidoras."


class SalvarTrocaGasRequest(BaseModel):
    competencia: Optional[Union[date, str]] = None
    ultima_troca: Optional[str] = None
    previsao_proxima_troca: Optional[str] = None
    observacao: Optional[str] = None


class SalvarMensagemVencimentoRequest(BaseModel):
    competencia: Optional[Union[date, str]] = None
    mensagem_vencimento: str


class DemonstrativoLeituraGasItem(BaseModel):
    apartamento_numero: str
    leitura_anterior: float
    leitura_atual: float
    m3_usado: float
    valor_a_pagar: float


class DemonstrativoGas(BaseModel):
    preco_m3: float = 19.95
    leituras: List[DemonstrativoLeituraGasItem] = Field(default_factory=list)
    total_m3: float = 0.0
    total_valor: float = 0.0
    troca_gas: DemonstrativoTrocaGas = Field(default_factory=DemonstrativoTrocaGas)


class DemonstrativoMensalResponse(BaseModel):
    competencia: date
    competencia_formatada: str
    vencimento_padrao: Optional[date] = None
    mensagem_vencimento: Optional[str] = None
    apartamentos_header: List[DemonstrativoApartamentoHeader] = Field(default_factory=list)
    despesas_itens: List[DemonstrativoDespesaItem] = Field(default_factory=list)
    total_despesas_mes: float = 0.0
    total_despesas_por_apto: dict[str, float] = Field(default_factory=dict)
    fundo_reserva: DemonstrativoFundoReserva
    cobrancas_moradores: List[DemonstrativoCobrancaApto] = Field(default_factory=list)
    total_cobrancas_mes: float = 0.0
    acoes_eventos: List[DemonstrativoAcaoEvento] = Field(default_factory=list)
    fracoes_agua: List[DemonstrativoFracaoAgua] = Field(default_factory=list)
    gas: DemonstrativoGas



