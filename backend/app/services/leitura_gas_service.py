from decimal import Decimal
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from app.models.leitura_gas import LeituraGas
from app.models.apartamento import Apartamento
from app.services.auditoria_service import registrar_auditoria

MESES_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
]


def _parse_competencia(comp: Any) -> date:
    if isinstance(comp, date):
        return date(comp.year, comp.month, 1)
    if isinstance(comp, str):
        try:
            dt = datetime.strptime(comp.strip()[:10], "%Y-%m-%d")
            return date(dt.year, dt.month, 1)
        except Exception:
            try:
                parts = comp.strip().split("-")
                if len(parts) >= 2:
                    return date(int(parts[0]), int(parts[1]), 1)
            except Exception:
                pass
    return date.today().replace(day=1)


async def create_leitura(db: AsyncSession, data: dict) -> LeituraGas:
    result = await db.execute(
        select(LeituraGas).where(
            LeituraGas.apartamento_id == data["apartamento_id"],
            LeituraGas.competencia == data["competencia"],
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe leitura para este apartamento nesta competência")

    leitura_anterior_val = data.get("leitura_anterior")
    if leitura_anterior_val is None:
        ant_result = await db.execute(
            select(LeituraGas).where(
                LeituraGas.apartamento_id == data["apartamento_id"],
                LeituraGas.competencia < data["competencia"],
            ).order_by(LeituraGas.competencia.desc()).limit(1)
        )
        anterior = ant_result.scalar_one_or_none()
        leitura_anterior_val = anterior.leitura_atual if anterior else Decimal("0")

    leitura_atual = Decimal(str(data["leitura_atual"]))
    leitura_anterior_dec = Decimal(str(leitura_anterior_val)) if leitura_anterior_val is not None else Decimal("0")
    consumo = max(Decimal("0"), leitura_atual - leitura_anterior_dec)

    valor_unitario = Decimal(str(data.get("valor_unitario") or "19.95"))
    valor_cobrado = (consumo * valor_unitario).quantize(Decimal("0.01")) if valor_unitario > 0 else Decimal("0.00")

    leitura = LeituraGas(
        apartamento_id=data["apartamento_id"],
        competencia=data["competencia"],
        leitura_anterior=leitura_anterior_dec,
        leitura_atual=leitura_atual,
        consumo=consumo,
        valor_unitario=valor_unitario if valor_unitario > 0 else None,
        valor_cobrado=valor_cobrado,
        observacao=data.get("observacao"),
    )
    db.add(leitura)
    await db.commit()
    return await get_leitura(db, str(leitura.id))


async def get_leitura(db: AsyncSession, leitura_id: str) -> LeituraGas:
    result = await db.execute(
        select(LeituraGas)
        .options(selectinload(LeituraGas.apartamento))
        .where(LeituraGas.id == leitura_id)
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Leitura não encontrada")
    return l


async def list_leituras(db, page=1, page_size=20, apartamento_id=None, competencia=None):
    query = select(LeituraGas).options(selectinload(LeituraGas.apartamento))
    if apartamento_id:
        query = query.where(LeituraGas.apartamento_id == apartamento_id)
    if competencia:
        parsed_comp = _parse_competencia(competencia)
        query = query.where(LeituraGas.competencia == parsed_comp)
    return query.order_by(LeituraGas.competencia.desc(), LeituraGas.apartamento_id)


async def update_leitura(db: AsyncSession, leitura_id: str, data: dict) -> LeituraGas:
    leitura = await get_leitura(db, leitura_id)
    for key, value in data.items():
        if value is not None:
            setattr(leitura, key, value)
    if "leitura_atual" in data or "leitura_anterior" in data or "valor_unitario" in data:
        leitura_ant = Decimal(str(leitura.leitura_anterior or 0))
        leitura_atual = Decimal(str(leitura.leitura_atual or 0))
        leitura.consumo = max(Decimal("0"), leitura_atual - leitura_ant)
        unit = Decimal(str(leitura.valor_unitario or "19.95"))
        leitura.valor_cobrado = (leitura.consumo * unit).quantize(Decimal("0.01"))
    await db.commit()
    await db.refresh(leitura)
    return leitura


async def delete_leitura(db: AsyncSession, leitura_id: str) -> None:
    leitura = await get_leitura(db, leitura_id)
    await db.delete(leitura)
    await db.commit()


async def obter_planilha_gas(db: AsyncSession, competencia: Any) -> Dict[str, Any]:
    comp = _parse_competencia(competencia)
    comp_formatada = f"{MESES_PT[comp.month - 1]}/{comp.year}"

    # 1. Carrega todos os apartamentos
    aptos_result = await db.execute(
        select(Apartamento).order_by(Apartamento.numero)
    )
    apartamentos = aptos_result.scalars().all()

    # 2. Carrega leituras existentes desta competência
    leituras_result = await db.execute(
        select(LeituraGas).where(LeituraGas.competencia == comp)
    )
    leituras_existentes = leituras_result.scalars().all()
    leituras_map = {lg.apartamento_id: lg for lg in leituras_existentes}

    # 3. Determina o valor unitário padrão (se houver em alguma leitura, usa; senão 19.95)
    valor_unitario_padrao = Decimal("19.95")
    for lg in leituras_existentes:
        if lg.valor_unitario and Decimal(str(lg.valor_unitario)) > 0:
            valor_unitario_padrao = Decimal(str(lg.valor_unitario))
            break

    # 4. Para apartamentos sem leitura no mês, busca a leitura imediatamente anterior
    itens = []
    total_consumo = Decimal("0.00")
    total_valor = Decimal("0.00")

    for apto in apartamentos:
        lg = leituras_map.get(apto.id)
        if lg:
            ant = float(lg.leitura_anterior) if lg.leitura_anterior is not None else 0.0
            atual = float(lg.leitura_atual) if lg.leitura_atual is not None else None
            consumo = float(lg.consumo) if lg.consumo is not None else 0.0
            unitario = float(lg.valor_unitario) if lg.valor_unitario is not None else float(valor_unitario_padrao)
            valor = float(lg.valor_cobrado) if lg.valor_cobrado is not None else 0.0
            obs = lg.observacao
            leitura_id = lg.id
        else:
            # Busca leitura anterior mais recente
            ant_result = await db.execute(
                select(LeituraGas).where(
                    LeituraGas.apartamento_id == apto.id,
                    LeituraGas.competencia < comp,
                ).order_by(LeituraGas.competencia.desc()).limit(1)
            )
            ant_obj = ant_result.scalar_one_or_none()
            ant = float(ant_obj.leitura_atual) if ant_obj and ant_obj.leitura_atual is not None else 0.0
            atual = None
            consumo = 0.0
            unitario = float(valor_unitario_padrao)
            valor = 0.0
            obs = None
            leitura_id = None

        if consumo:
            total_consumo += Decimal(str(consumo))
        if valor:
            total_valor += Decimal(str(valor))

        itens.append({
            "apartamento_id": apto.id,
            "apartamento_numero": apto.numero,
            "apartamento_bloco": apto.bloco,
            "leitura_anterior": ant,
            "leitura_atual": atual,
            "consumo": consumo,
            "valor_unitario": unitario,
            "valor_cobrado": valor,
            "observacao": obs,
            "leitura_id": leitura_id,
        })

    return {
        "competencia": comp,
        "competencia_formatada": comp_formatada,
        "valor_unitario_padrao": float(valor_unitario_padrao),
        "total_consumo_m3": float(total_consumo),
        "total_valor_cobrado": float(total_valor),
        "itens": itens,
    }


async def salvar_leituras_lote(db: AsyncSession, data: dict, usuario=None) -> Dict[str, Any]:
    comp = _parse_competencia(data["competencia"])
    valor_unitario_padrao = Decimal(str(data.get("valor_unitario_padrao") or "19.95"))
    leituras_data = data.get("leituras", [])

    # Carrega leituras já existentes para esta competência
    existentes_result = await db.execute(
        select(LeituraGas).where(LeituraGas.competencia == comp)
    )
    existentes_map = {lg.apartamento_id: lg for lg in existentes_result.scalars().all()}

    alterados_count = 0

    for item in leituras_data:
        apto_id = item["apartamento_id"]
        leitura_atual = item.get("leitura_atual")
        leitura_anterior = item.get("leitura_anterior")
        item_unitario = item.get("valor_unitario")
        obs = item.get("observacao")

        unit = Decimal(str(item_unitario if item_unitario is not None else valor_unitario_padrao))

        if leitura_atual is not None and str(leitura_atual).strip() != "":
            atual_dec = Decimal(str(leitura_atual))
            ant_dec = Decimal(str(leitura_anterior)) if leitura_anterior is not None and str(leitura_anterior).strip() != "" else Decimal("0")
            consumo_dec = max(Decimal("0"), atual_dec - ant_dec)
            valor_cobrado_dec = (consumo_dec * unit).quantize(Decimal("0.01"))

            lg = existentes_map.get(apto_id)
            if lg:
                lg.leitura_anterior = ant_dec
                lg.leitura_atual = atual_dec
                lg.consumo = consumo_dec
                lg.valor_unitario = unit
                lg.valor_cobrado = valor_cobrado_dec
                lg.observacao = obs
            else:
                novo_lg = LeituraGas(
                    apartamento_id=apto_id,
                    competencia=comp,
                    leitura_anterior=ant_dec,
                    leitura_atual=atual_dec,
                    consumo=consumo_dec,
                    valor_unitario=unit,
                    valor_cobrado=valor_cobrado_dec,
                    observacao=obs,
                )
                db.add(novo_lg)
            alterados_count += 1

    await registrar_auditoria(
        db,
        acao="SALVAR_LOTE",
        entidade_tipo="leituras_gas",
        entidade_id=None,
        dados_novos={"competencia": str(comp), "alterados_count": alterados_count},
        usuario=usuario,
    )

    await db.commit()
    return await obter_planilha_gas(db, comp)

