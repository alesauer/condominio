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
from app.models.aviso import Aviso
from app.models.apartamento_morador import ApartamentoMorador
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
    valor_fundo_reserva: Decimal = Decimal("0.00"),
    valor_base_condominio: Optional[Decimal] = None,
) -> Dict[str, Any]:
    if valor_base_condominio is not None and valor_fundo_reserva == Decimal("0.00"):
        valor_fundo_reserva = valor_base_condominio

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
    competencia: date = data["competencia"]
    vencimento: date = data["vencimento"]
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
            "valor_fundo_reserva": float(v_fundo_apto),
            "valor_base": float(v_fundo_apto),
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
    competencia: date = data["competencia"]
    vencimento: date = data["vencimento"]
    valor_fundo = Decimal(str(data.get("valor_fundo_reserva") or data.get("valor_base_condominio") or 0))
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

        # Monta detalhamento das parcelas para a descrição
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
            "total_fundo_reserva": float(calc["total_fundo_reserva"]),
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
        "total_fundo_reserva": float(calc["total_fundo_reserva"]),
        "total_base": float(calc["total_base"]),
        "total_valor": float(total_valor),
        "competencia": competencia,
        "cobrancas": cobrancas_recarregadas,
    }


MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]


async def obter_demonstrativo_mensal(db: AsyncSession, competencia: date) -> Dict[str, Any]:
    competencia = date(competencia.year, competencia.month, 1)
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
    apartamentos_header = []

    for apto in apartamentos:
        f = Decimal(str(apto.fracao_ideal)) if apto.fracao_ideal and Decimal(str(apto.fracao_ideal)) > 0 else Decimal("0.142857")
        fracoes_map[apto.id] = f

        if apto.responsavel and apto.responsavel.nome:
            resp_nome = apto.responsavel.nome
        elif apto.proprietario and apto.proprietario.nome:
            resp_nome = f"{apto.proprietario.nome} (PROPRIETÁRIO)"
        elif apto.moradores:
            nomes = [m.morador.nome for m in apto.moradores if m.morador and m.morador.nome]
            resp_nome = " e ".join(nomes[:2]) if nomes else "Morador"
        else:
            resp_nome = "—"

        responsaveis_map[apto.id] = resp_nome

        apartamentos_header.append({
            "id": apto.id,
            "numero": apto.numero,
            "bloco": apto.bloco,
            "fracao_ideal": float(f),
            "responsavel_nome": resp_nome,
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

    for d in despesas_unicas:
        v = Decimal(str(d.valor))
        total_despesas_mes += v
        rateio = {}
        soma_parcial = Decimal("0.00")
        for apto in apartamentos:
            v_apto = (fracoes_map[apto.id] / soma_fracoes * v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            rateio[apto.numero] = float(v_apto)
            total_despesas_por_apto[apto.numero] += v_apto
            soma_parcial += v_apto
        diff = v - soma_parcial
        if diff != Decimal("0.00") and apartamentos:
            maior = max(apartamentos, key=lambda a: fracoes_map[a.id])
            rateio[maior.numero] = float(Decimal(str(rateio[maior.numero])) + diff)
            total_despesas_por_apto[maior.numero] += diff

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
        soma_parcial = Decimal("0.00")
        for apto in apartamentos:
            v_apto = (fracoes_map[apto.id] / soma_fracoes * v).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            rateio[apto.numero] = float(v_apto)
            total_despesas_por_apto[apto.numero] += v_apto
            soma_parcial += v_apto
        diff = v - soma_parcial
        if diff != Decimal("0.00") and apartamentos:
            maior = max(apartamentos, key=lambda a: fracoes_map[a.id])
            rateio[maior.numero] = float(Decimal(str(rateio[maior.numero])) + diff)
            total_despesas_por_apto[maior.numero] += diff

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
                    part = c.descricao.split("Fundo Reserva: R$")[1].split("|")[0].strip()
                    valor_fundo_unitario = Decimal(part)
                    break
                except Exception:
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
                    "responsavel_nome": responsaveis_map[apto.id],
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
                    "responsavel_nome": responsaveis_map[apto.id],
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
            val = (
                calc["despesas_map"].get(apto_id, Decimal("0.00"))
                + calc["agua_map"].get(apto_id, Decimal("0.00"))
                + calc["gas_map"].get(apto_id, Decimal("0.00"))
                + valor_fundo_unitario
            )
            total_cobrancas_mes += val
            cobrancas_moradores.append({
                "apartamento_id": apto_id,
                "apartamento_numero": apto.numero,
                "responsavel_nome": responsaveis_map.get(apto_id, "—"),
                "valor_a_pagar": float(val),
                "vencimento": vencimento_padrao,
                "status": "pendente",
                "data_pagamento": None,
                "confirmacao_pgto": "",
            })

    # 5. Ações / Eventos Realizados no Mês
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

    return {
        "competencia": competencia,
        "competencia_formatada": competencia_formatada,
        "vencimento_padrao": vencimento_padrao or date(competencia.year, competencia.month, 10),
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
                "ultima_troca": "08/2026",
                "previsao_proxima_troca": "11/2026",
                "observacao": "Quando necessário, será adquirido novo botijão de gás no valor de R$ 399,00, retirando do fundo e cobrado mensalmente das unidades consumidoras.",
            },
        },
    }


