from datetime import date
from decimal import Decimal
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.cobranca import Cobranca
from app.models.apartamento import Apartamento
from app.models.receita import Receita, TipoReceita, StatusFinanceiro
from app.models.agua_rateio import AguaRateio
from app.models.agua_rateio_apartamento import AguaRateioApartamento
from app.models.leitura_gas import LeituraGas
from app.services.auditoria_service import registrar_auditoria


async def list_cobrancas(db: AsyncSession, page=1, page_size=20, apartamento_id=None, competencia=None, status=None):
    query = select(Cobranca)
    if apartamento_id:
        query = query.where(Cobranca.apartamento_id == apartamento_id)
    if competencia:
        query = query.where(Cobranca.competencia == competencia)
    if status:
        query = query.where(Cobranca.status == status)
    return query.order_by(Cobranca.vencimento.desc())


async def get_cobranca(db: AsyncSession, cobranca_id: str) -> Cobranca:
    result = await db.execute(select(Cobranca).where(Cobranca.id == cobranca_id))
    cob = result.scalar_one_or_none()
    if not cob:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cobrança não encontrada")
    return cob


async def pagar_cobranca(db: AsyncSession, cobranca_id: str, usuario=None) -> Cobranca:
    cob = await get_cobranca(db, cobranca_id)
    if cob.status == "pago":
        return cob

    dados_anteriores = {"status": str(cob.status), "data_pagamento": str(cob.data_pagamento) if cob.data_pagamento else None}

    cob.status = "pago"
    cob.data_pagamento = date.today()

    # Cria automaticamente a receita correspondente
    valor_efetivo = cob.valor_total if (cob.valor_total and cob.valor_total > 0) else cob.valor
    rec = Receita(
        descricao=f"Pagamento {cob.descricao}",
        tipo=TipoReceita.condominio,
        categoria="taxa_condominial",
        competencia=cob.competencia,
        vencimento=cob.vencimento,
        valor=valor_efetivo,
        status=StatusFinanceiro.pago,
        data_recebimento=date.today(),
        apartamento_id=cob.apartamento_id,
    )
    db.add(rec)
    await db.flush()
    cob.receita_id = rec.id

    await registrar_auditoria(
        db,
        acao="PAGAR",
        entidade_tipo="cobrancas",
        entidade_id=cob.id,
        dados_anteriores=dados_anteriores,
        dados_novos={"status": "pago", "data_pagamento": str(date.today()), "receita_id": str(rec.id)},
        usuario=usuario,
    )

    await db.commit()
    await db.refresh(cob)
    return cob


async def gerar_cobrancas_mensais(db: AsyncSession, data: dict, usuario=None) -> Dict[str, Any]:
    competencia: date = data["competencia"]
    vencimento: date = data["vencimento"]
    valor_base = Decimal(str(data.get("valor_base_condominio", 0)))
    incluir_agua: bool = data.get("incluir_agua", True)
    incluir_gas: bool = data.get("incluir_gas", True)
    descricao_custom: str = data.get("descricao")

    # 1. Carrega todos os apartamentos
    aptos_result = await db.execute(select(Apartamento))
    apartamentos = aptos_result.scalars().all()

    if not apartamentos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum apartamento cadastrado")

    # 2. Carrega rateio de água da competência se solicitado
    agua_map: Dict[Any, Decimal] = {}
    if incluir_agua:
        rateio_result = await db.execute(
            select(AguaRateio).where(AguaRateio.competencia == competencia)
        )
        rateio_agua = rateio_result.scalar_one_or_none()
        if rateio_agua:
            detalhes_result = await db.execute(
                select(AguaRateioApartamento).where(AguaRateioApartamento.rateio_id == rateio_agua.id)
            )
            for d in detalhes_result.scalars():
                agua_map[d.apartamento_id] = Decimal(str(d.valor_calculado))

    # 3. Carrega consumo de gás da competência se solicitado
    gas_map: Dict[Any, Decimal] = {}
    if incluir_gas:
        leituras_result = await db.execute(
            select(LeituraGas).where(LeituraGas.mes_referencia == competencia)
        )
        for lg in leituras_result.scalars():
            if lg.valor_total:
                gas_map[lg.apartamento_id] = Decimal(str(lg.valor_total))

    # 4. Busca cobranças já existentes para não duplicar
    existentes_result = await db.execute(
        select(Cobranca.apartamento_id).where(Cobranca.competencia == competencia)
    )
    existentes_apto_ids = set(existentes_result.scalars().all())

    geradas: List[Cobranca] = []
    total_valor = Decimal("0.00")

    comp_formatada = competencia.strftime("%m/%Y")

    for apto in apartamentos:
        if apto.id in existentes_apto_ids:
            continue

        valor_agua = agua_map.get(apto.id, Decimal("0.00"))
        valor_gas = gas_map.get(apto.id, Decimal("0.00"))
        valor_total_apto = (valor_base + valor_agua + valor_gas).quantize(Decimal("0.01"))

        if descricao_custom:
            desc = f"{descricao_custom} - Apto {apto.numero}"
        else:
            desc = f"Taxa Condominial Apto {apto.numero} - Ref. {comp_formatada}"

        cobranca = Cobranca(
            apartamento_id=apto.id,
            descricao=desc,
            competencia=competencia,
            vencimento=vencimento,
            valor=valor_total_apto,
            multa=Decimal("0.00"),
            juros=Decimal("0.00"),
            valor_total=valor_total_apto,
            status=StatusFinanceiro.pendente,
        )
        db.add(cobranca)
        geradas.append(cobranca)
        total_valor += valor_total_apto

    await db.flush()

    await registrar_auditoria(
        db,
        acao="GERAR_COBRANCAS_LOTE",
        entidade_tipo="cobrancas",
        dados_novos={
            "competencia": str(competencia),
            "vencimento": str(vencimento),
            "geradas": len(geradas),
            "total_valor": float(total_valor),
        },
        usuario=usuario,
    )

    await db.commit()

    for cob in geradas:
        await db.refresh(cob)

    return {
        "geradas": len(geradas),
        "total_valor": float(total_valor),
        "competencia": competencia,
        "cobrancas": geradas,
    }
