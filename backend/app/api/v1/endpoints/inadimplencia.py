from decimal import Decimal
from math import ceil
from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.permissions import admin_required
from app.models.cobranca import Cobranca
from app.models.config_inadimplencia import ConfigInadimplencia
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ConfigUpdate(BaseModel):
    percentual_multa: Optional[float] = None
    percentual_juros_mes: Optional[float] = None
    dias_tolerancia: Optional[int] = None


@router.get("/config")
async def get_config(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ConfigInadimplencia).limit(1))
    config = r.scalar_one_or_none()
    if not config:
        config = ConfigInadimplencia(percentual_multa=2.00, percentual_juros_mes=1.00, dias_tolerancia=5)
        db.add(config); await db.commit(); await db.refresh(config)
    return {"percentual_multa": float(config.percentual_multa), "percentual_juros_mes": float(config.percentual_juros_mes), "dias_tolerancia": config.dias_tolerancia}


@router.put("/config", dependencies=[Depends(admin_required)])
async def update_config(data: ConfigUpdate, db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ConfigInadimplencia).limit(1))
    config = r.scalar_one_or_none()
    if not config:
        config = ConfigInadimplencia()
        db.add(config)
    if data.percentual_multa is not None: config.percentual_multa = data.percentual_multa
    if data.percentual_juros_mes is not None: config.percentual_juros_mes = data.percentual_juros_mes
    if data.dias_tolerancia is not None: config.dias_tolerancia = data.dias_tolerancia
    await db.commit(); await db.refresh(config)
    return {"percentual_multa": float(config.percentual_multa), "percentual_juros_mes": float(config.percentual_juros_mes), "dias_tolerancia": config.dias_tolerancia}


@router.get("/cobrancas-atrasadas", dependencies=[Depends(admin_required)])
async def cobrancas_atrasadas(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Cobranca).where(Cobranca.status.in_(["pendente", "atrasado"]), Cobranca.vencimento < date.today()))
    return r.scalars().all()


@router.post("/recalcular", dependencies=[Depends(admin_required)])
async def recalcular(db: AsyncSession = Depends(get_db)):
    config_r = await db.execute(select(ConfigInadimplencia).limit(1))
    config = config_r.scalar_one_or_none()
    if not config: return {"message": "Configuração não encontrada"}

    r = await db.execute(select(Cobranca).where(Cobranca.status != "pago"))
    cobrancas = r.scalars().all()
    hoje = date.today()

    for cob in cobrancas:
        if cob.vencimento and cob.vencimento < hoje:
            dias_atraso = (hoje - cob.vencimento).days - config.dias_tolerancia
            if dias_atraso > 0:
                multa = cob.valor * (config.percentual_multa / Decimal("100"))
                meses_atraso = max(1, ceil(dias_atraso / 30))
                juros = cob.valor * (config.percentual_juros_mes / Decimal("100")) * Decimal(meses_atraso)
                cob.multa = multa; cob.juros = juros
                cob.valor_total = cob.valor + multa + juros
                cob.status = "atrasado"

    await db.commit()
    return {"message": "Cobranças recalculadas"}
