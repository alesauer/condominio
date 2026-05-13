from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, usuarios, apartamentos, proprietarios, moradores,
    receitas, despesas, cobrancas, agua_rateios, leituras_gas,
    avisos, assembleias, documentos, dashboard, inadimplencia, relatorios, auditoria,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(usuarios.router, prefix="/usuarios", tags=["usuarios"])
api_router.include_router(apartamentos.router, prefix="/apartamentos", tags=["apartamentos"])
api_router.include_router(proprietarios.router, prefix="/proprietarios", tags=["proprietarios"])
api_router.include_router(moradores.router, prefix="/moradores", tags=["moradores"])
api_router.include_router(receitas.router, prefix="/receitas", tags=["receitas"])
api_router.include_router(despesas.router, prefix="/despesas", tags=["despesas"])
api_router.include_router(cobrancas.router, prefix="/cobrancas", tags=["cobrancas"])
api_router.include_router(agua_rateios.router, prefix="/agua", tags=["agua"])
api_router.include_router(leituras_gas.router, prefix="/gas", tags=["gas"])
api_router.include_router(avisos.router, prefix="/avisos", tags=["avisos"])
api_router.include_router(assembleias.router, prefix="/assembleias", tags=["assembleias"])
api_router.include_router(documentos.router, prefix="/documentos", tags=["documentos"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(inadimplencia.router, prefix="/inadimplencia", tags=["inadimplencia"])
api_router.include_router(relatorios.router, prefix="/relatorios", tags=["relatorios"])
api_router.include_router(auditoria.router, prefix="/auditoria", tags=["auditoria"])
