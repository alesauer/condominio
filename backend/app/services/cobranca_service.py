from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.cobranca import Cobranca
from app.models.apartamento import Apartamento
from app.models.receita import Receita, TipoReceita, StatusFinanceiro
from app.models.despesa import Despesa
from app.models.despesa_parcela import DespesaParcela
from app.models.agua_rateio import AguaRateio
from app.models.agua_rateio_apartamento import AguaRateioApartamento
from app.models.leitura_gas import LeituraGas
from app.services.auditoria_service import registrar_auditoria


async def list_cobrancas(db: AsyncSession, page=1, page_size=20, apartamento_id=None, competencia=None, status=None):
    query = select(Cobranca).options(selectinload(Cobranca.apartamento))
    if apartamento_id:
        query = query.where(Cobranca.apartamento_id == apartamento_id)
    if competencia:
        query = query.where(Cobranca.competencia == competencia)
    if status:
        query = query.where(Cobranca.status == status)
    return query.order_by(Cobranca.vencimento.desc())


async def get_cobranca(db: AsyncSession, cobranca_id: str) -> Cobranca:
    result = await db.execute(
        select(Cobranca)
        .options(selectinload(Cobranca.apartamento))
        .where(Cobranca.id == cobranca_id)
    )
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


async def _calcular_componentes_cobranca(
    db: AsyncSession,
    competencia: date,
    incluir_despesas: bool = True,
    incluir_agua: bool = True,
    incluir_gas: bool = True,
    valor_base_condominio: Decimal = Decimal("0.00"),
) -> Dict[str, Any]:
    # 1. Carrega todos os apartamentos
    aptos_result = await db.execute(select(Apartamento).order_by(Apartamento.numero))
    apartamentos = aptos_result.scalars().all()

    if not apartamentos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum apartamento cadastrado")

    # Mapeia frações ideais
    fracoes_map = {}
    for apto in apartamentos:
        if apto.fracao_ideal is not None and Decimal(str(apto.fracao_ideal)) > 0:
            fracoes_map[apto.id] = Decimal(str(apto.fracao_ideal))
        else:
            fracoes_map[apto.id] = Decimal("1.0")

    soma_fracoes = sum(fracoes_map.values()) or Decimal("1.0")

    # 2. Despesas do Mês
    despesas_map: Dict[Any, Decimal] = {apto.id: Decimal("0.00") for apto in apartamentos}
    total_despesas_mes = Decimal("0.00")

    if incluir_despesas:
        # Despesas únicas
        desp_res = await db.execute(
            select(Despesa).where(
                Despesa.competencia == competencia,
                Despesa.parcelamento == False,
                Despesa.status != StatusFinanceiro.cancelado,
            )
        )
        despesas_unicas = desp_res.scalars().all()

        # Parcelas de despesas
        parc_res = await db.execute(
            select(DespesaParcela).where(
                DespesaParcela.competencia == competencia,
                DespesaParcela.status != StatusFinanceiro.cancelado,
            )
        )
        parcelas = parc_res.scalars().all()

        total_despesas_mes = sum((Decimal(str(d.valor)) for d in despesas_unicas), Decimal("0.00")) + \
                             sum((Decimal(str(p.valor)) for p in parcelas), Decimal("0.00"))

        if total_despesas_mes > Decimal("0.00"):
            soma_desp_calc = Decimal("0.00")
            for apto in apartamentos:
                fracao = fracoes_map[apto.id]
                v_apto = (fracao / soma_fracoes * total_despesas_mes).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                despesas_map[apto.id] = v_apto
                soma_desp_calc += v_apto

            diff_desp = total_despesas_mes - soma_desp_calc
            if diff_desp != Decimal("0.00") and apartamentos:
                maior_apto = max(apartamentos, key=lambda a: fracoes_map[a.id])
                despesas_map[maior_apto.id] += diff_desp

    # 3. Rateio de Água
    agua_map: Dict[Any, Decimal] = {apto.id: Decimal("0.00") for apto in apartamentos}
    total_agua = Decimal("0.00")

    if incluir_agua:
        rateio_result = await db.execute(
            select(AguaRateio).where(AguaRateio.competencia == competencia)
        )
        rateio_agua = rateio_result.scalar_one_or_none()
        if rateio_agua:
            detalhes_result = await db.execute(
                select(AguaRateioApartamento).where(AguaRateioApartamento.rateio_id == rateio_agua.id)
            )
            for d in detalhes_result.scalars().all():
                val = Decimal(str(d.valor_calculado))
                agua_map[d.apartamento_id] = val
                total_agua += val

    # 4. Consumo de Gás
    gas_map: Dict[Any, Decimal] = {apto.id: Decimal("0.00") for apto in apartamentos}
    total_gas = Decimal("0.00")

    if incluir_gas:
        leituras_result = await db.execute(
            select(LeituraGas).where(LeituraGas.competencia == competencia)
        )
        for lg in leituras_result.scalars().all():
            val = lg.valor_cobrado if lg.valor_cobrado is not None else Decimal("0.00")
            if val:
                val_dec = Decimal(str(val))
                gas_map[lg.apartamento_id] = val_dec
                total_gas += val_dec

    total_base = valor_base_condominio * len(apartamentos)

    return {
        "apartamentos": apartamentos,
        "fracoes_map": fracoes_map,
        "soma_fracoes": soma_fracoes,
        "despesas_map": despesas_map,
        "total_despesas_mes": total_despesas_mes,
        "agua_map": agua_map,
        "total_agua": total_agua,
        "gas_map": gas_map,
        "total_gas": total_gas,
        "valor_base": valor_base_condominio,
        "total_base": total_base,
    }


async def calcular_previa_cobrancas(db: AsyncSession, data: dict) -> Dict[str, Any]:
    competencia: date = data["competencia"]
    vencimento: date = data["vencimento"]
    valor_base = Decimal(str(data.get("valor_base_condominio", 0)))
    incluir_despesas: bool = data.get("incluir_despesas", True)
    incluir_agua: bool = data.get("incluir_agua", True)
    incluir_gas: bool = data.get("incluir_gas", True)

    calc = await _calcular_componentes_cobranca(
        db,
        competencia=competencia,
        incluir_despesas=incluir_despesas,
        incluir_agua=incluir_agua,
        incluir_gas=incluir_gas,
        valor_base_condominio=valor_base,
    )

    apartamentos = calc["apartamentos"]
    despesas_map = calc["despesas_map"]
    agua_map = calc["agua_map"]
    gas_map = calc["gas_map"]
    fracoes_map = calc["fracoes_map"]

    existentes_result = await db.execute(
        select(Cobranca.apartamento_id).where(Cobranca.competencia == competencia)
    )
    existentes_apto_ids = set(existentes_result.scalars().all())

    detalhes_aptos = []
    total_geral = Decimal("0.00")

    for apto in apartamentos:
        v_desp = despesas_map.get(apto.id, Decimal("0.00"))
        v_agua = agua_map.get(apto.id, Decimal("0.00"))
        v_gas = gas_map.get(apto.id, Decimal("0.00"))
        v_base = valor_base
        v_tot = (v_desp + v_agua + v_gas + v_base).quantize(Decimal("0.01"))
        total_geral += v_tot

        tipo_str = str(apto.tipo.value) if hasattr(apto.tipo, "value") else str(apto.tipo)
        detalhes_aptos.append({
            "apartamento_id": apto.id,
            "apartamento_numero": apto.numero,
            "apartamento_bloco": apto.bloco,
            "apartamento_tipo": tipo_str,
            "fracao_ideal": float(fracoes_map[apto.id]),
            "valor_despesas": float(v_desp),
            "valor_agua": float(v_agua),
            "valor_gas": float(v_gas),
            "valor_base": float(v_base),
            "valor_total": float(v_tot),
            "ja_gerado": apto.id in existentes_apto_ids,
        })

    return {
        "competencia": competencia,
        "vencimento": vencimento,
        "total_despesas_mes": float(calc["total_despesas_mes"]),
        "total_agua": float(calc["total_agua"]),
        "total_gas": float(calc["total_gas"]),
        "total_base": float(calc["total_base"]),
        "total_geral": float(total_geral),
        "apartamentos": detalhes_aptos,
    }


async def gerar_cobrancas_mensais(db: AsyncSession, data: dict, usuario=None) -> Dict[str, Any]:
    competencia: date = data["competencia"]
    vencimento: date = data["vencimento"]
    valor_base = Decimal(str(data.get("valor_base_condominio", 0)))
    incluir_despesas: bool = data.get("incluir_despesas", True)
    incluir_agua: bool = data.get("incluir_agua", True)
    incluir_gas: bool = data.get("incluir_gas", True)
    descricao_custom: str = data.get("descricao")

    calc = await _calcular_componentes_cobranca(
        db,
        competencia=competencia,
        incluir_despesas=incluir_despesas,
        incluir_agua=incluir_agua,
        incluir_gas=incluir_gas,
        valor_base_condominio=valor_base,
    )

    apartamentos = calc["apartamentos"]
    despesas_map = calc["despesas_map"]
    agua_map = calc["agua_map"]
    gas_map = calc["gas_map"]

    # Busca cobranças já existentes para não duplicar
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

        v_desp = despesas_map.get(apto.id, Decimal("0.00"))
        v_agua = agua_map.get(apto.id, Decimal("0.00"))
        v_gas = gas_map.get(apto.id, Decimal("0.00"))
        v_base = valor_base
        valor_total_apto = (v_desp + v_agua + v_gas + v_base).quantize(Decimal("0.01"))

        # Monta detalhamento das parcelas para a descrição
        partes = []
        if v_desp > 0:
            partes.append(f"Desp: R$ {v_desp:.2f}")
        if v_agua > 0:
            partes.append(f"Água: R$ {v_agua:.2f}")
        if v_gas > 0:
            partes.append(f"Gás: R$ {v_gas:.2f}")
        if v_base > 0:
            partes.append(f"Base: R$ {v_base:.2f}")

        detalhe_str = f" ({' | '.join(partes)})" if partes else ""

        if descricao_custom:
            desc = f"{descricao_custom} - Apto {apto.numero}{detalhe_str}"
        else:
            desc = f"Taxa Condominial Apto {apto.numero} - Ref. {comp_formatada}{detalhe_str}"

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
            "total_despesas_mes": float(calc["total_despesas_mes"]),
            "total_agua": float(calc["total_agua"]),
            "total_gas": float(calc["total_gas"]),
        },
        usuario=usuario,
    )

    await db.commit()

    # Recarrega as cobranças geradas com o relacionamento apartamento
    cobrancas_recarregadas = []
    if geradas:
        ids_geradas = [c.id for c in geradas]
        res = await db.execute(
            select(Cobranca)
            .options(selectinload(Cobranca.apartamento))
            .where(Cobranca.id.in_(ids_geradas))
            .order_by(Cobranca.created_at)
        )
        cobrancas_recarregadas = res.scalars().all()

    return {
        "geradas": len(cobrancas_recarregadas),
        "total_despesas_mes": float(calc["total_despesas_mes"]),
        "total_agua": float(calc["total_agua"]),
        "total_gas": float(calc["total_gas"]),
        "total_base": float(calc["total_base"]),
        "total_valor": float(total_valor),
        "competencia": competencia,
        "cobrancas": cobrancas_recarregadas,
    }
