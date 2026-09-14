from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional
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
from app.models.aviso import Aviso, PrioridadeAviso
from app.models.troca_gas_config import TrocaGasConfig
from app.models.demonstrativo_config import DemonstrativoConfig
from app.models.apartamento_morador import ApartamentoMorador
from app.services.auditoria_service import registrar_auditoria
from app.services.email_service import send_email


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


MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]


def _parse_competencia(comp: Any) -> date:
    if isinstance(comp, date):
        return date(comp.year, comp.month, 1)
    if isinstance(comp, str):
        comp = comp.strip()
        if len(comp) == 7 and "-" in comp:
            parts = comp.split("-")
            return date(int(parts[0]), int(parts[1]), 1)
        from datetime import datetime
        try:
            dt = datetime.strptime(comp[:10], "%Y-%m-%d").date()
            return date(dt.year, dt.month, 1)
        except Exception:
            pass
    return date.today().replace(day=1)


def _parse_date(d: Any) -> date:
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        from datetime import datetime
        try:
            return datetime.strptime(d.strip()[:10], "%Y-%m-%d").date()
        except Exception:
            pass
    return date.today()


async def _calcular_componentes_cobranca(
    db: AsyncSession,
    competencia: Any,
    incluir_despesas: bool = True,
    incluir_agua: bool = True,
    incluir_gas: bool = True,
    valor_fundo_reserva: Decimal = Decimal("0.00"),
    valor_base_condominio: Optional[Decimal] = None,
) -> Dict[str, Any]:
    competencia = _parse_competencia(competencia)
    if valor_base_condominio is not None and valor_fundo_reserva == Decimal("0.00"):
        valor_fundo_reserva = valor_base_condominio

    # 1. Carrega todos os apartamentos
    aptos_result = await db.execute(
        select(Apartamento)
        .options(
            selectinload(Apartamento.proprietario),
            selectinload(Apartamento.responsavel),
        )
        .order_by(Apartamento.numero)
    )
    apartamentos = aptos_result.scalars().all()

    if not apartamentos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum apartamento cadastrado")

    # Mapeia frações ideais
    fracoes_map = {}
    for apto in apartamentos:
        if apto.fracao_ideal is not None and Decimal(str(apto.fracao_ideal)) > 0:
            fracoes_map[apto.id] = Decimal(str(apto.fracao_ideal))
        else:
            fracoes_map[apto.id] = (Decimal("1.0") / Decimal(str(len(apartamentos)))).quantize(Decimal("0.000001"))

    soma_fracoes = sum(fracoes_map.values())
    if soma_fracoes <= Decimal("0.00"):
        soma_fracoes = Decimal("1.0")

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
            select(DespesaParcela)
            .options(selectinload(DespesaParcela.despesa))
            .where(
                DespesaParcela.competencia == competencia,
                DespesaParcela.status != StatusFinanceiro.cancelado,
            )
        )
        parcelas = parc_res.scalars().all()

        num_aptos = Decimal(str(len(apartamentos)))

        # Process single despesas: fraction only for water/copasa, equal for other expenses
        for d in despesas_unicas:
            v = Decimal(str(d.valor))
            total_despesas_mes += v
            desc = d.descricao or ""
            desc_lower = desc.lower()
            cat = d.categoria or ""
            cat_lower = cat.lower()
            is_agua = "copasa" in desc_lower or "água" in desc_lower or "agua" in desc_lower or cat_lower == "agua"

            for apto in apartamentos:
                if is_agua:
                    v_apto = (fracoes_map[apto.id] / soma_fracoes * v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                else:
                    v_apto = (v / num_aptos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                despesas_map[apto.id] += v_apto

        # Process parcelas: fraction only for water/copasa, equal for other expenses
        for p in parcelas:
            v = Decimal(str(p.valor))
            total_despesas_mes += v
            desc = p.despesa.descricao if p.despesa and p.despesa.descricao else "Despesa Parcelada"
            desc_lower = desc.lower()
            cat = p.despesa.categoria if p.despesa and p.despesa.categoria else ""
            cat_lower = cat.lower()
            is_agua = "copasa" in desc_lower or "água" in desc_lower or "agua" in desc_lower or cat_lower == "agua"

            for apto in apartamentos:
                if is_agua:
                    v_apto = (fracoes_map[apto.id] / soma_fracoes * v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                else:
                    v_apto = (v / num_aptos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                despesas_map[apto.id] += v_apto


    # 3. Rateio de Água
    agua_map: Dict[Any, Decimal] = {apto.id: Decimal("0.00") for apto in apartamentos}
    total_agua = Decimal("0.00")

    if incluir_agua:
        rateio_result = await db.execute(
            select(AguaRateio).where(AguaRateio.competencia == competencia)
        )
        rateio_agua = rateio_result.scalars().first()
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
                if lg.apartamento_id in gas_map:
                    gas_map[lg.apartamento_id] = val_dec
                total_gas += val_dec

    total_fundo = valor_fundo_reserva * len(apartamentos)

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
        "valor_fundo_reserva": valor_fundo_reserva,
        "total_fundo_reserva": total_fundo,
        "valor_base": valor_fundo_reserva,
        "total_base": total_fundo,
    }


async def calcular_previa_cobrancas(db: AsyncSession, data: dict) -> Dict[str, Any]:
    competencia = _parse_competencia(data["competencia"])
    vencimento = _parse_date(data["vencimento"])
    valor_fundo = Decimal(str(data.get("valor_fundo_reserva") or data.get("valor_base_condominio") or 0))
    incluir_despesas: bool = data.get("incluir_despesas", True)
    incluir_agua: bool = data.get("incluir_agua", True)
    incluir_gas: bool = data.get("incluir_gas", True)

    calc = await _calcular_componentes_cobranca(
        db,
        competencia=competencia,
        incluir_despesas=incluir_despesas,
        incluir_agua=incluir_agua,
        incluir_gas=incluir_gas,
        valor_fundo_reserva=valor_fundo,
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
        v_fundo_apto = valor_fundo
        v_tot = (v_desp + v_agua + v_gas + v_fundo_apto).quantize(Decimal("0.01"))
        total_geral += v_tot

        is_alugado = (
            str(apto.status.value if hasattr(apto.status, "value") else apto.status).lower() == "alugado"
            or (apto.responsavel_id is not None and apto.proprietario_id is not None and apto.responsavel_id != apto.proprietario_id)
        )
        prop_nome = apto.proprietario.nome if apto.proprietario else None
        prop_email = apto.proprietario.email if apto.proprietario else None
        resp_nome = apto.responsavel.nome if apto.responsavel else (prop_nome or f"Apto {apto.numero}")
        resp_email = apto.responsavel.email if apto.responsavel else prop_email

        cota_inquilino = (v_desp + v_agua + v_gas).quantize(Decimal("0.01"))
        cota_proprietario = v_fundo_apto.quantize(Decimal("0.01"))

        tipo_str = str(apto.tipo.value) if hasattr(apto.tipo, "value") else str(apto.tipo)
        status_str = str(apto.status.value) if hasattr(apto.status, "value") else str(apto.status)
        detalhes_aptos.append({
            "apartamento_id": apto.id,
            "apartamento_numero": apto.numero,
            "apartamento_bloco": apto.bloco,
            "apartamento_tipo": tipo_str,
            "status": status_str,
            "is_alugado": is_alugado,
            "proprietario_nome": prop_nome,
            "proprietario_email": prop_email,
            "responsavel_nome": resp_nome,
            "responsavel_email": resp_email,
            "fracao_ideal": float(fracoes_map.get(apto.id, Decimal("0.0"))),
            "valor_despesas": float(v_desp),
            "valor_agua": float(v_agua),
            "valor_gas": float(v_gas),
            "valor_fundo_reserva": float(v_fundo_apto),
            "valor_base": float(v_fundo_apto),
            "cota_inquilino": float(cota_inquilino),
            "cota_proprietario": float(cota_proprietario),
            "valor_total": float(v_tot),
            "ja_gerado": apto.id in existentes_apto_ids,
        })

    return {
        "competencia": competencia,
        "vencimento": vencimento,
        "total_despesas_mes": float(calc["total_despesas_mes"]),
        "total_agua": float(calc["total_agua"]),
        "total_gas": float(calc["total_gas"]),
        "total_fundo_reserva": float(calc["total_fundo_reserva"]),
        "total_base": float(calc["total_base"]),
        "total_geral": float(total_geral),
        "apartamentos": detalhes_aptos,
    }


async def gerar_cobrancas_mensais(db: AsyncSession, data: dict, usuario=None) -> Dict[str, Any]:
    competencia = _parse_competencia(data["competencia"])
    vencimento = _parse_date(data["vencimento"])
    valor_fundo = Decimal(str(data.get("valor_fundo_reserva") or data.get("valor_base_condominio") or 0))
    incluir_despesas: bool = data.get("incluir_despesas", True)
    incluir_agua: bool = data.get("incluir_agua", True)
    incluir_gas: bool = data.get("incluir_gas", True)
    separar_fundo: bool = bool(data.get("separar_fundo_proprietario", False))
    descricao_custom: str = data.get("descricao")

    calc = await _calcular_componentes_cobranca(
        db,
        competencia=competencia,
        incluir_despesas=incluir_despesas,
        incluir_agua=incluir_agua,
        incluir_gas=incluir_gas,
        valor_fundo_reserva=valor_fundo,
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
        v_fundo_apto = valor_fundo
        valor_total_apto = (v_desp + v_agua + v_gas + v_fundo_apto).quantize(Decimal("0.01"))

        is_alugado = (
            str(apto.status.value if hasattr(apto.status, "value") else apto.status).lower() == "alugado"
            or (apto.responsavel_id is not None and apto.proprietario_id is not None and apto.responsavel_id != apto.proprietario_id)
        )

        if separar_fundo and is_alugado and v_fundo_apto > 0:
            # 1. Cobrança Inquilino (Despesas Ordinárias + Gás)
            v_inq = (v_desp + v_agua + v_gas).quantize(Decimal("0.01"))
            partes_inq = []
            if v_desp > 0:
                partes_inq.append(f"Desp: R$ {v_desp:.2f}")
            if v_agua > 0:
                partes_inq.append(f"Água: R$ {v_agua:.2f}")
            if v_gas > 0:
                partes_inq.append(f"Gás: R$ {v_gas:.2f}")
            detalhe_inq = f" ({' | '.join(partes_inq)})" if partes_inq else ""
            inq_nome = apto.responsavel.nome if apto.responsavel else "Inquilino"

            desc_inq = f"Taxa Condominial Apto {apto.numero} (Inquilino: {inq_nome}) - Ref. {comp_formatada}{detalhe_inq}"
            cobranca_inq = Cobranca(
                apartamento_id=apto.id,
                descricao=desc_inq,
                competencia=competencia,
                vencimento=vencimento,
                valor=v_inq,
                multa=Decimal("0.00"),
                juros=Decimal("0.00"),
                valor_total=v_inq,
                status=StatusFinanceiro.pendente,
            )
            db.add(cobranca_inq)
            geradas.append(cobranca_inq)
            total_valor += v_inq

            # 2. Cobrança Proprietário (Fundo de Reserva)
            v_prop = v_fundo_apto.quantize(Decimal("0.01"))
            prop_nome = apto.proprietario.nome if apto.proprietario else "Proprietário"
            desc_prop = f"Fundo de Reserva Apto {apto.numero} (Proprietário: {prop_nome}) - Ref. {comp_formatada} (Fundo Reserva: R$ {v_fundo_apto:.2f})"
            cobranca_prop = Cobranca(
                apartamento_id=apto.id,
                descricao=desc_prop,
                competencia=competencia,
                vencimento=vencimento,
                valor=v_prop,
                multa=Decimal("0.00"),
                juros=Decimal("0.00"),
                valor_total=v_prop,
                status=StatusFinanceiro.pendente,
            )
            db.add(cobranca_prop)
            geradas.append(cobranca_prop)
            total_valor += v_prop
        else:
            # Cobrança Única Consolidada
            partes = []
            if v_desp > 0:
                partes.append(f"Desp: R$ {v_desp:.2f}")
            if v_agua > 0:
                partes.append(f"Água: R$ {v_agua:.2f}")
            if v_gas > 0:
                partes.append(f"Gás: R$ {v_gas:.2f}")
            if v_fundo_apto > 0:
                partes.append(f"Fundo Reserva: R$ {v_fundo_apto:.2f}")

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

    # Salva ações e eventos informados para o mês
    acoes_input = data.get("acoes_eventos") or []
    if acoes_input:
        try:
            await salvar_acoes_eventos(db, competencia=competencia, acoes_eventos=acoes_input, usuario=usuario)
        except Exception:
            pass

    await db.flush()

    try:
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
                "total_fundo_reserva": float(calc["total_fundo_reserva"]),
                "acoes_eventos_count": len(acoes_input),
            },
            usuario=usuario,
        )
    except Exception:
        pass

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
        "total_fundo_reserva": float(calc["total_fundo_reserva"]),
        "total_base": float(calc["total_base"]),
        "total_valor": float(total_valor),
        "competencia": competencia,
        "cobrancas": cobrancas_recarregadas,
    }



async def obter_demonstrativo_mensal(db: AsyncSession, competencia: Any) -> Dict[str, Any]:
    competencia = _parse_competencia(competencia)
    competencia_formatada = f"{MESES_PT[competencia.month - 1]}/{competencia.year}"

    # 1. Apartamentos ordenados
    aptos_res = await db.execute(
        select(Apartamento)
        .options(
            selectinload(Apartamento.proprietario),
            selectinload(Apartamento.responsavel),
            selectinload(Apartamento.moradores).selectinload(ApartamentoMorador.morador),
        )
        .order_by(Apartamento.numero)
    )
    apartamentos = aptos_res.scalars().all()
    if not apartamentos:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nenhum apartamento cadastrado")

    fracoes_map = {}
    responsaveis_map = {}
    responsaveis_email_map = {}
    apartamentos_header = []

    for apto in apartamentos:
        f = Decimal(str(apto.fracao_ideal)) if apto.fracao_ideal and Decimal(str(apto.fracao_ideal)) > 0 else Decimal("0.142857")
        fracoes_map[apto.id] = f

        prop_nome = apto.proprietario.nome if apto.proprietario else None
        prop_email = apto.proprietario.email if apto.proprietario else None
        is_alugado = (
            str(apto.status.value if hasattr(apto.status, "value") else apto.status).lower() == "alugado"
            or (apto.responsavel_id is not None and apto.proprietario_id is not None and apto.responsavel_id != apto.proprietario_id)
        )

        resp_email = None
        if apto.responsavel and apto.responsavel.nome:
            resp_nome = apto.responsavel.nome
            resp_email = apto.responsavel.email
        elif apto.proprietario and apto.proprietario.nome:
            resp_nome = f"{apto.proprietario.nome}"
            resp_email = apto.proprietario.email
        elif apto.moradores:
            nomes = [m.morador.nome for m in apto.moradores if m.morador and m.morador.nome]
            resp_nome = " e ".join(nomes[:2]) if nomes else "Morador"
            emails = [m.morador.email for m in apto.moradores if m.morador and m.morador.email]
            resp_email = emails[0] if emails else None
        else:
            resp_nome = "—"
            resp_email = None

        responsaveis_map[apto.id] = resp_nome
        responsaveis_email_map[apto.id] = resp_email

        apartamentos_header.append({
            "id": apto.id,
            "numero": apto.numero,
            "bloco": apto.bloco,
            "fracao_ideal": float(f),
            "status": str(apto.status.value if hasattr(apto.status, "value") else apto.status),
            "is_alugado": is_alugado,
            "proprietario_nome": prop_nome,
            "proprietario_email": prop_email,
            "responsavel_nome": resp_nome,
            "responsavel_email": resp_email,
        })

    soma_fracoes = sum(fracoes_map.values()) or Decimal("1.0")

    # 2. Despesas do Mês
    desp_unicas_res = await db.execute(
        select(Despesa).where(
            Despesa.competencia == competencia,
            Despesa.parcelamento == False,
            Despesa.status != StatusFinanceiro.cancelado,
        ).order_by(Despesa.created_at)
    )
    despesas_unicas = desp_unicas_res.scalars().all()

    parc_res = await db.execute(
        select(DespesaParcela)
        .options(selectinload(DespesaParcela.despesa))
        .where(
            DespesaParcela.competencia == competencia,
            DespesaParcela.status != StatusFinanceiro.cancelado,
        ).order_by(DespesaParcela.created_at)
    )
    parcelas = parc_res.scalars().all()

    despesas_itens = []
    total_despesas_por_apto = {apto.numero: Decimal("0.00") for apto in apartamentos}
    total_despesas_mes = Decimal("0.00")
    num_aptos = Decimal(str(len(apartamentos)))

    for d in despesas_unicas:
        v = Decimal(str(d.valor))
        total_despesas_mes += v
        rateio = {}
        soma_parcial = Decimal("0.00")

        # O cálculo da fração ideal é exclusivo para a despesa de água (Copasa). Demais despesas são divididas igualmente.
        desc_lower = d.descricao.lower()
        cat_lower = (d.categoria or "").lower()
        is_agua = "copasa" in desc_lower or "água" in desc_lower or "agua" in desc_lower or cat_lower == "agua"

        for apto in apartamentos:
            if is_agua:
                v_apto = (fracoes_map[apto.id] / soma_fracoes * v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                v_apto = (v / num_aptos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            rateio[apto.numero] = float(v_apto)
            total_despesas_por_apto[apto.numero] += v_apto

        obs = d.observacao or ""
        if not obs and d.vencimento:
            obs = f"{d.vencimento.strftime('%d/%m/%Y')}"

        despesas_itens.append({
            "id": str(d.id),
            "descricao": d.descricao,
            "observacao": obs,
            "valor": float(v),
            "rateio_por_apto": rateio,
        })

    for p in parcelas:
        v = Decimal(str(p.valor))
        total_despesas_mes += v
        desc = p.despesa.descricao if p.despesa else "Despesa Parcelada"
        tot_parc = p.despesa.total_parcelas if p.despesa and p.despesa.total_parcelas else "?"
        desc_full = f"{desc} ({p.numero_parcela}/{tot_parc})"
        rateio = {}

        desc_lower = desc.lower()
        cat_lower = (p.despesa.categoria if p.despesa and p.despesa.categoria else "").lower()
        is_agua = "copasa" in desc_lower or "água" in desc_lower or "agua" in desc_lower or cat_lower == "agua"

        for apto in apartamentos:
            if is_agua:
                v_apto = (fracoes_map[apto.id] / soma_fracoes * v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            else:
                v_apto = (v / num_aptos).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            rateio[apto.numero] = float(v_apto)
            total_despesas_por_apto[apto.numero] += v_apto


        obs = p.observacao or (p.despesa.observacao if p.despesa else "") or ""
        if not obs and p.vencimento:
            obs = f"{p.vencimento.strftime('%d/%m/%Y')}"

        despesas_itens.append({
            "id": str(p.id),
            "descricao": desc_full,
            "observacao": obs,
            "valor": float(v),
            "rateio_por_apto": rateio,
        })

    # 3. Fundo de Reserva
    cob_res = await db.execute(
        select(Cobranca).where(Cobranca.competencia == competencia).order_by(Cobranca.vencimento)
    )
    cobrancas_existentes = cob_res.scalars().all()

    valor_fundo_unitario = Decimal("250.00")
    if cobrancas_existentes:
        for c in cobrancas_existentes:
            if "Fundo Reserva: R$" in c.descricao:
                try:
                    part = c.descricao.split("Fundo Reserva: R$")[1].split("|")[0].replace(")", "").strip()
                    valor_fundo_unitario = Decimal(part)
                    break
                except Exception:
                    pass
                    pass

    total_fundo = valor_fundo_unitario * len(apartamentos)
    fundo_rateio = {apto.numero: float(valor_fundo_unitario) for apto in apartamentos}
    fundo_reserva_data = {
        "descricao": f"Fundo de reserva/obras mensal fixo em R$ {valor_fundo_unitario:.2f}/apartamento",
        "valor_unitario": float(valor_fundo_unitario),
        "valor_total": float(total_fundo),
        "rateio_por_apto": fundo_rateio,
    }

    # 4. Cobranças dos Moradores / Proprietários
    cobrancas_moradores = []
    total_cobrancas_mes = Decimal("0.00")
    vencimento_padrao = None

    cobrancas_por_apto = {c.apartamento_id: c for c in cobrancas_existentes}

    if cobrancas_por_apto:
        for apto in apartamentos:
            is_alugado = (
                str(apto.status.value if hasattr(apto.status, "value") else apto.status).lower() == "alugado"
                or (apto.responsavel_id is not None and apto.proprietario_id is not None and apto.responsavel_id != apto.proprietario_id)
            )
            prop_nome = apto.proprietario.nome if apto.proprietario else None
            prop_email = apto.proprietario.email if apto.proprietario else None
            status_apto = str(apto.status.value if hasattr(apto.status, "value") else apto.status)
            cota_inq = float(total_despesas_por_apto.get(apto.numero, Decimal("0.00")))
            cota_prop = float(valor_fundo_unitario)

            c = cobrancas_por_apto.get(apto.id)
            if c:
                val = Decimal(str(c.valor_total if c.valor_total and c.valor_total > 0 else c.valor))
                total_cobrancas_mes += val
                if not vencimento_padrao:
                    vencimento_padrao = c.vencimento
                conf = c.data_pagamento.strftime('%d/%m/%Y') if (c.status == StatusFinanceiro.pago and c.data_pagamento) else ("Pago" if c.status == StatusFinanceiro.pago else "")
                cobrancas_moradores.append({
                    "apartamento_id": apto.id,
                    "apartamento_numero": apto.numero,
                    "bloco": apto.bloco,
                    "status_apartamento": status_apto,
                    "is_alugado": is_alugado,
                    "proprietario_nome": prop_nome,
                    "proprietario_email": prop_email,
                    "responsavel_nome": responsaveis_map[apto.id],
                    "responsavel_email": responsaveis_email_map.get(apto.id),
                    "cota_inquilino": cota_inq,
                    "cota_proprietario": cota_prop,
                    "valor_a_pagar": float(val),
                    "vencimento": c.vencimento,
                    "status": c.status.value if hasattr(c.status, "value") else str(c.status),
                    "data_pagamento": c.data_pagamento,
                    "confirmacao_pgto": conf,
                })
            else:
                cobrancas_moradores.append({
                    "apartamento_id": apto.id,
                    "apartamento_numero": apto.numero,
                    "bloco": apto.bloco,
                    "status_apartamento": status_apto,
                    "is_alugado": is_alugado,
                    "proprietario_nome": prop_nome,
                    "proprietario_email": prop_email,
                    "responsavel_nome": responsaveis_map[apto.id],
                    "responsavel_email": responsaveis_email_map.get(apto.id),
                    "cota_inquilino": cota_inq,
                    "cota_proprietario": cota_prop,
                    "valor_a_pagar": float(total_despesas_por_apto[apto.numero] + valor_fundo_unitario),
                    "vencimento": date(competencia.year, competencia.month, 10),
                    "status": "pendente",
                    "data_pagamento": None,
                    "confirmacao_pgto": "",
                })
    else:
        calc = await _calcular_componentes_cobranca(
            db,
            competencia=competencia,
            incluir_despesas=True,
            incluir_agua=True,
            incluir_gas=True,
            valor_fundo_reserva=valor_fundo_unitario,
        )
        for apto in apartamentos:
            apto_id = apto.id
            is_alugado = (
                str(apto.status.value if hasattr(apto.status, "value") else apto.status).lower() == "alugado"
                or (apto.responsavel_id is not None and apto.proprietario_id is not None and apto.responsavel_id != apto.proprietario_id)
            )
            prop_nome = apto.proprietario.nome if apto.proprietario else None
            prop_email = apto.proprietario.email if apto.proprietario else None
            status_apto = str(apto.status.value if hasattr(apto.status, "value") else apto.status)
            cota_inq = float(
                calc["despesas_map"].get(apto_id, Decimal("0.00"))
                + calc["agua_map"].get(apto_id, Decimal("0.00"))
                + calc["gas_map"].get(apto_id, Decimal("0.00"))
            )
            cota_prop = float(valor_fundo_unitario)
            val = Decimal(str(cota_inq + cota_prop))
            total_cobrancas_mes += val
            cobrancas_moradores.append({
                "apartamento_id": apto_id,
                "apartamento_numero": apto.numero,
                "bloco": apto.bloco,
                "status_apartamento": status_apto,
                "is_alugado": is_alugado,
                "proprietario_nome": prop_nome,
                "proprietario_email": prop_email,
                "responsavel_nome": responsaveis_map.get(apto_id, "—"),
                "responsavel_email": responsaveis_email_map.get(apto_id),
                "cota_inquilino": cota_inq,
                "cota_proprietario": cota_prop,
                "valor_a_pagar": float(val),
                "vencimento": vencimento_padrao,
                "status": "pendente",
                "data_pagamento": None,
                "confirmacao_pgto": "",
            })

    # 5. Ações / Eventos Realizados no Mês
    start_date = date(competencia.year, competencia.month, 1)
    if competencia.month == 12:
        end_date = date(competencia.year + 1, 1, 1)
    else:
        end_date = date(competencia.year, competencia.month + 1, 1)

    avisos_res = await db.execute(
        select(Aviso)
        .where(Aviso.data_publicacao >= start_date, Aviso.data_publicacao < end_date)
        .order_by(Aviso.data_publicacao.asc(), Aviso.created_at.asc())
    )
    avisos = avisos_res.scalars().all()
    if not avisos:
        # Se ainda não houver avisos no mês específico, busca os mais recentes
        avisos_res = await db.execute(
            select(Aviso)
            .order_by(Aviso.data_publicacao.desc(), Aviso.created_at.desc())
            .limit(10)
        )
        avisos = avisos_res.scalars().all()

    acoes_eventos = []
    for a in avisos:
        acoes_eventos.append({
            "id": str(a.id),
            "titulo": a.titulo,
            "descricao": a.descricao,
            "data": a.data_publicacao,
        })

    # 6. Frações de Água (Agrupadas)
    fracoes_agua = [
        {
            "descricao": "Fração Apto 101, 401 e 402",
            "fracao": 0.171432,
            "percentual_formatado": "0,171432 (17,1432%)",
        },
        {
            "descricao": "Fração Apto 201, 202, 301, 302",
            "fracao": 0.121426,
            "percentual_formatado": "0,121426 (12,1426%)",
        },
    ]

    # 7. Gás
    gas_res = await db.execute(
        select(LeituraGas).where(LeituraGas.competencia == competencia)
    )
    leituras_gas = gas_res.scalars().all()
    leituras_map = {lg.apartamento_id: lg for lg in leituras_gas}

    leituras_gas_itens = []
    total_gas_m3 = Decimal("0.00")
    total_gas_valor = Decimal("0.00")
    preco_gas = Decimal("19.95")

    for apto in apartamentos:
        lg = leituras_map.get(apto.id)
        if lg:
            m3 = Decimal(str(lg.consumo or 0))
            val = Decimal(str(lg.valor_cobrado or 0))
            ant = Decimal(str(lg.leitura_anterior or 0))
            atual = Decimal(str(lg.leitura_atual or 0))
            if lg.valor_unitario:
                preco_gas = Decimal(str(lg.valor_unitario))
        else:
            m3 = Decimal("0.00")
            val = Decimal("0.00")
            ant = Decimal("0.00")
            atual = Decimal("0.00")

        total_gas_m3 += m3
        total_gas_valor += val

        leituras_gas_itens.append({
            "apartamento_numero": apto.numero,
            "leitura_anterior": float(ant),
            "leitura_atual": float(atual),
            "m3_usado": float(m3),
            "valor_a_pagar": float(val),
        })

    # Consulta configuração de troca de gás para a competência ou global
    troca_gas_res = await db.execute(
        select(TrocaGasConfig)
        .where(
            (TrocaGasConfig.competencia == competencia) | (TrocaGasConfig.competencia.is_(None))
        )
        .order_by(TrocaGasConfig.competencia.desc().nullslast(), TrocaGasConfig.updated_at.desc())
    )
    troca_gas_cfg = troca_gas_res.scalars().first()

    ultima_troca = troca_gas_cfg.ultima_troca if (troca_gas_cfg and troca_gas_cfg.ultima_troca) else "08/2026"
    previsao_proxima = troca_gas_cfg.previsao_proxima_troca if (troca_gas_cfg and troca_gas_cfg.previsao_proxima_troca) else "11/2026"
    obs_troca = (
        troca_gas_cfg.observacao
        if (troca_gas_cfg and troca_gas_cfg.observacao)
        else "Quando necessário, será adquirido novo botijão de gás no valor de R$ 399,00, retirando do fundo e cobrado mensalmente das unidades consumidoras."
    )

    # Consulta configuração geral do demonstrativo (mensagem de vencimento)
    venc_date = vencimento_padrao or date(competencia.year, competencia.month, 10)
    venc_str = venc_date.strftime('%d/%m/%Y')
    mensagem_padrao = f"VENCIMENTO: {venc_str}. APÓS ESSA DATA, O PAGAMENTO ACARRETARÁ JUROS E MULTA CONFORME ESTABELECIDO NA CONVENÇÃO DO CONDOMÍNIO."

    demo_cfg_res = await db.execute(
        select(DemonstrativoConfig)
        .where(
            (DemonstrativoConfig.competencia == competencia) | (DemonstrativoConfig.competencia.is_(None))
        )
        .order_by(DemonstrativoConfig.competencia.desc().nullslast(), DemonstrativoConfig.updated_at.desc())
    )
    demo_cfg = demo_cfg_res.scalars().first()
    if demo_cfg and demo_cfg.mensagem_vencimento and demo_cfg.mensagem_vencimento.strip():
        mensagem_vencimento = demo_cfg.mensagem_vencimento.strip().replace("{vencimento}", venc_str)
    else:
        mensagem_vencimento = mensagem_padrao

    return {
        "competencia": competencia,
        "competencia_formatada": competencia_formatada,
        "vencimento_padrao": venc_date,
        "mensagem_vencimento": mensagem_vencimento,
        "apartamentos_header": apartamentos_header,
        "despesas_itens": despesas_itens,
        "total_despesas_mes": float(total_despesas_mes),
        "total_despesas_por_apto": {k: float(v) for k, v in total_despesas_por_apto.items()},
        "fundo_reserva": fundo_reserva_data,
        "cobrancas_moradores": cobrancas_moradores,
        "total_cobrancas_mes": float(total_cobrancas_mes),
        "acoes_eventos": acoes_eventos,
        "fracoes_agua": fracoes_agua,
        "gas": {
            "preco_m3": float(preco_gas),
            "leituras": leituras_gas_itens,
            "total_m3": float(total_gas_m3),
            "total_valor": float(total_gas_valor),
            "troca_gas": {
                "ultima_troca": ultima_troca,
                "previsao_proxima_troca": previsao_proxima,
                "observacao": obs_troca,
            },
        },
    }


async def salvar_mensagem_vencimento(db: AsyncSession, data: Any, usuario=None) -> Dict[str, Any]:
    if hasattr(data, "model_dump"):
        data_dict = data.model_dump()
    elif isinstance(data, dict):
        data_dict = data
    else:
        data_dict = vars(data)

    comp = data_dict.get("competencia")
    if comp:
        comp = _parse_competencia(comp)

    query = select(DemonstrativoConfig)
    if comp:
        query = query.where(DemonstrativoConfig.competencia == comp)
    else:
        query = query.where(DemonstrativoConfig.competencia.is_(None))

    res = await db.execute(query)
    cfg = res.scalar_one_or_none()

    if not cfg:
        cfg = DemonstrativoConfig(competencia=comp)
        db.add(cfg)

    msg = str(data_dict.get("mensagem_vencimento") or "").strip()
    cfg.mensagem_vencimento = msg

    await db.commit()
    await db.refresh(cfg)

    return {
        "competencia": cfg.competencia,
        "mensagem_vencimento": cfg.mensagem_vencimento,
    }


async def salvar_troca_gas_config(db: AsyncSession, data: Any, usuario=None) -> Dict[str, Any]:
    if hasattr(data, "model_dump"):
        data_dict = data.model_dump()
    elif isinstance(data, dict):
        data_dict = data
    else:
        data_dict = vars(data)

    comp = data_dict.get("competencia")
    if comp:
        comp = _parse_competencia(comp)

    query = select(TrocaGasConfig)
    if comp:
        query = query.where(TrocaGasConfig.competencia == comp)
    else:
        query = query.where(TrocaGasConfig.competencia.is_(None))

    res = await db.execute(query)
    cfg = res.scalar_one_or_none()

    if not cfg:
        cfg = TrocaGasConfig(competencia=comp)
        db.add(cfg)

    if "ultima_troca" in data_dict and data_dict["ultima_troca"] is not None:
        cfg.ultima_troca = str(data_dict["ultima_troca"]).strip()
    if "previsao_proxima_troca" in data_dict and data_dict["previsao_proxima_troca"] is not None:
        cfg.previsao_proxima_troca = str(data_dict["previsao_proxima_troca"]).strip()
    if "observacao" in data_dict and data_dict["observacao"] is not None:
        cfg.observacao = str(data_dict["observacao"]).strip()

    await db.commit()
    await db.refresh(cfg)

    return {
        "ultima_troca": cfg.ultima_troca or "08/2026",
        "previsao_proxima_troca": cfg.previsao_proxima_troca or "11/2026",
        "observacao": cfg.observacao or "Quando necessário, será adquirido novo botijão de gás no valor de R$ 399,00, retirando do fundo e cobrado mensalmente das unidades consumidoras.",
    }


async def salvar_acoes_eventos(db: AsyncSession, competencia: Any, acoes_eventos: List[Any], usuario=None) -> List[Dict[str, Any]]:
    comp_date = _parse_competencia(competencia)
    salvos = []
    for item in acoes_eventos:
        if hasattr(item, "model_dump"):
            item = item.model_dump()
        if isinstance(item, dict):
            item_id = item.get("id")
            t = (item.get("titulo") or "").strip()
            d = (item.get("descricao") or "").strip()
            dt = _parse_date(item.get("data") or comp_date)
        else:
            item_id = getattr(item, "id", None)
            t = (getattr(item, "titulo", None) or "").strip()
            d = (getattr(item, "descricao", None) or "").strip()
            dt = _parse_date(getattr(item, "data", None) or comp_date)

        if not t or not d:
            continue

        if item_id:
            try:
                import uuid
                item_uuid = uuid.UUID(str(item_id)) if not isinstance(item_id, uuid.UUID) else item_id
                res = await db.execute(select(Aviso).where(Aviso.id == item_uuid))
                aviso = res.scalars().first()
                if aviso:
                    aviso.titulo = t
                    aviso.descricao = d
                    aviso.data_publicacao = dt
                    salvos.append(aviso)
                    continue
            except Exception:
                pass

        novo_aviso = Aviso(
            titulo=t,
            descricao=d,
            data_publicacao=dt,
            prioridade=PrioridadeAviso.baixa,
        )
        db.add(novo_aviso)
        salvos.append(novo_aviso)

    await db.flush()
    await db.commit()
    for a in salvos:
        await db.refresh(a)

    return [
        {
            "id": str(a.id),
            "titulo": a.titulo,
            "descricao": a.descricao,
            "data": a.data_publicacao,
        }
        for a in salvos
    ]


async def delete_acao_evento(db: AsyncSession, aviso_id: str, usuario=None) -> None:
    try:
        import uuid
        uid = uuid.UUID(str(aviso_id)) if not isinstance(aviso_id, uuid.UUID) else aviso_id
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ID inválido")
    res = await db.execute(select(Aviso).where(Aviso.id == uid))
    aviso = res.scalars().first()
    if not aviso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ação/Evento não encontrado")
    await db.delete(aviso)
    await db.commit()



async def enviar_email_demonstrativo(db: AsyncSession, data: Any, usuario=None) -> Dict[str, Any]:
    if hasattr(data, "model_dump"):
        data_dict = data.model_dump()
    elif isinstance(data, dict):
        data_dict = data
    else:
        data_dict = vars(data)

    comp = _parse_competencia(data_dict.get("competencia"))
    comp_formatada = f"{MESES_PT[comp.month - 1]}/{comp.year}"

    # Carrega dados do demonstrativo para compor o email
    demonstrativo = await obter_demonstrativo_mensal(db, comp)

    pdf_base64 = data_dict.get("pdf_base64")
    assunto_custom = data_dict.get("assunto")
    msg_custom = data_dict.get("mensagem_personalizada")
    destinatarios_req = data_dict.get("destinatarios")

    assunto = assunto_custom or f"Demonstrativo Mensal de Condomínio — {comp_formatada} — Residencial Monazita"

    # Determina a lista de destinatários
    lista_envio = []
    if destinatarios_req and len(destinatarios_req) > 0:
        for item in destinatarios_req:
            if isinstance(item, dict):
                em = (item.get("email") or "").strip()
                if em:
                    lista_envio.append({
                        "apartamento_numero": item.get("apartamento_numero", ""),
                        "nome": item.get("responsavel_nome") or item.get("nome") or "Morador",
                        "email": em,
                    })
            else:
                em = getattr(item, "email", None)
                if em:
                    lista_envio.append({
                        "apartamento_numero": getattr(item, "apartamento_numero", ""),
                        "nome": getattr(item, "responsavel_nome", None) or getattr(item, "nome", "Morador"),
                        "email": em,
                    })
    else:
        # Pega todos os apartamentos do demonstrativo
        for header in demonstrativo.get("apartamentos_header", []):
            em = header.get("responsavel_email")
            if em and em.strip():
                lista_envio.append({
                    "apartamento_numero": header.get("numero", ""),
                    "nome": header.get("responsavel_nome", "Morador"),
                    "email": em.strip(),
                })

    if not lista_envio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum destinatário com e-mail válido selecionado para o envio.",
        )

    filename_pdf = f"Demonstrativo_Condominio_{comp.year}_{comp.month:02d}.pdf"
    anexos = []
    if pdf_base64:
        anexos.append({
            "filename": filename_pdf,
            "content": pdf_base64,
            "content_type": "application/pdf",
        })

    resultados = []
    total_enviados = 0
    total_falhas = 0

    for dest in lista_envio:
        apto_num = dest["apartamento_numero"]
        nome_resp = dest["nome"]
        dest_email = dest["email"]

        # Busca dados da cobrança do apartamento se existir
        cobranca_apto = next((c for c in demonstrativo.get("cobrancas_moradores", []) if c.get("apartamento_numero") == apto_num), None)
        valor_apto_str = f"R$ {cobranca_apto['valor_a_pagar']:.2f}".replace(".", ",") if cobranca_apto else ""
        venc_str = cobranca_apto["vencimento"].strftime('%d/%m/%Y') if cobranca_apto and cobranca_apto.get("vencimento") else f"10/{comp.month:02d}/{comp.year}"

        corpo_texto = f"""Olá, {nome_resp}!

Segue em anexo o Demonstrativo Mensal de Fechamento do Condomínio Residencial Monazita referente à competência {comp_formatada}.

Resumo da Unidade (Apto {apto_num}):
- Vencimento: {venc_str}
{f"- Valor a Pagar: {valor_apto_str}" if valor_apto_str else ""}

{msg_custom if msg_custom else ""}

{demonstrativo.get('mensagem_vencimento', '')}

Atenciosamente,
Administração do Condomínio Residencial Monazita
"""

        corpo_html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: #0f2c59; color: #ffffff; padding: 24px; text-align: center; }}
    .header h1 {{ margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }}
    .header p {{ margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; }}
    .content {{ padding: 24px; line-height: 1.6; font-size: 14px; }}
    .card {{ background: #f1f5f9; border-left: 4px solid #0f2c59; padding: 14px 18px; border-radius: 6px; margin: 18px 0; }}
    .alert-box {{ background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; padding: 12px; border-radius: 6px; font-size: 12px; font-style: italic; margin: 16px 0; }}
    .footer {{ background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CONDOMÍNIO RESIDENCIAL MONAZITA</h1>
      <p>Demonstrativo Mensal de Fechamento — {comp_formatada}</p>
    </div>
    <div class="content">
      <p>Olá, <strong>{nome_resp}</strong> (Apartamento {apto_num}),</p>
      <p>Informamos que o <strong>Demonstrativo Mensal Consolidado</strong> do condomínio relativo ao mês de <strong>{comp_formatada}</strong> já foi apurado e está disponível.</p>
      
      <div class="card">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #0f2c59;">RESUMO DA SUA UNIDADE (APTO {apto_num})</div>
        <div>📅 <strong>Vencimento:</strong> {venc_str}</div>
        {f'<div>💰 <strong>Valor do Condomínio:</strong> <span style="font-size: 16px; font-weight: bold; color: #0f2c59;">{valor_apto_str}</span></div>' if valor_apto_str else ''}
      </div>

      {f'<p style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 10px; border-radius: 6px; font-size: 13px; color: #6b21a8;"><strong>Mensagem da Administração:</strong><br>{msg_custom}</p>' if msg_custom else ''}

      <div class="alert-box">
        {demonstrativo.get('mensagem_vencimento', '')}
      </div>

      <p style="font-size: 13px; color: #475569;">
        📎 <em>O relatório detalhado em PDF com a memória de cálculo completa de despesas, água, gás e fundo de reserva segue em anexo a este e-mail.</em>
      </p>
    </div>
    <div class="footer">
      Condomínio Residencial Monazita — Gestão e Transparência Financeira<br>
      Mensagem automática enviada pelo sistema.
    </div>
  </div>
</body>
</html>
"""

        try:
            ok = await send_email(
                destinatarios=[dest_email],
                assunto=assunto,
                corpo_texto=corpo_texto,
                corpo_html=corpo_html,
                anexos=anexos if anexos else None,
            )
            if ok:
                total_enviados += 1
                resultados.append({
                    "apartamento_numero": apto_num,
                    "nome": nome_resp,
                    "email": dest_email,
                    "status": "enviado",
                    "erro": None,
                })
            else:
                total_falhas += 1
                resultados.append({
                    "apartamento_numero": apto_num,
                    "nome": nome_resp,
                    "email": dest_email,
                    "status": "falha",
                    "erro": "Falha ao despachar e-mail pelo servidor SMTP",
                })
        except Exception as ex:
            total_falhas += 1
            resultados.append({
                "apartamento_numero": apto_num,
                "nome": nome_resp,
                "email": dest_email,
                "status": "falha",
                "erro": str(ex),
            })

    # Auditoria
    await registrar_auditoria(
        db,
        usuario,
        "ENVIO_DEMONSTRATIVO_EMAIL",
        "Cobranca",
        None,
        dados_novos={
            "competencia": str(comp),
            "total_enviados": total_enviados,
            "total_falhas": total_falhas,
            "destinatarios": [d["email"] for d in lista_envio],
        },
    )

    return {
        "sucesso": total_enviados > 0,
        "competencia": comp,
        "competencia_formatada": comp_formatada,
        "total_enviados": total_enviados,
        "total_falhas": total_falhas,
        "destinatarios": resultados,
    }


