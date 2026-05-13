from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from io import BytesIO
from app.core.database import get_db
from app.core.permissions import admin_required
from app.models.receita import Receita
from app.models.despesa import Despesa
from app.models.cobranca import Cobranca

router = APIRouter()


@router.get("/balancete", dependencies=[Depends(admin_required)])
async def balancete(mes: int = Query(...), ano: int = Query(...), formato: str = Query("excel"), db: AsyncSession = Depends(get_db)):
    from datetime import date
    inicio = date(ano, mes, 1)
    if mes == 12: fim = date(ano + 1, 1, 1)
    else: fim = date(ano, mes + 1, 1)

    receitas_r = await db.execute(select(Receita).where(Receita.competencia >= inicio, Receita.competencia < fim))
    despesas_r = await db.execute(select(Despesa).where(Despesa.competencia >= inicio, Despesa.competencia < fim))

    if formato == "excel":
        from openpyxl import Workbook
        wb = Workbook(); ws = wb.active; ws.title = f"Balancete {mes}/{ano}"
        ws.append(["Tipo", "Descrição", "Valor", "Status"])
        for r in receitas_r.scalars(): ws.append(["Receita", r.descricao, float(r.valor), str(r.status)])
        for d in despesas_r.scalars(): ws.append(["Despesa", d.descricao, float(d.valor), str(d.status)])
        buf = BytesIO(); wb.save(buf); buf.seek(0)
        return StreamingResponse(buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=balancete_{mes}_{ano}.xlsx"})
    elif formato == "pdf":
        from reportlab.pdfgen import canvas
        buf = BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(50, 800, f"Balancete {mes}/{ano}")
        y = 770
        for r in receitas_r.scalars():
            c.drawString(50, y, f"Receita: {r.descricao} - R$ {float(r.valor):.2f}")
            y -= 20
        for d in despesas_r.scalars():
            c.drawString(50, y, f"Despesa: {d.descricao} - R$ {float(d.valor):.2f}")
            y -= 20
        c.save(); buf.seek(0)
        return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=balancete_{mes}_{ano}.pdf"})
    return {"detail": "Formato inválido"}
