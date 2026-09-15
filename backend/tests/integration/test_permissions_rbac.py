"""Integration tests to verify RBAC permissions: Síndico (Admin) vs Morador/Proprietário (Read-Only)."""
import pytest
from httpx import AsyncClient


class TestRBACPermissions:
    async def test_morador_can_read_all_modules(self, client_morador: AsyncClient):
        """Morador must have read-only access to view all core modules."""
        # 1. Apartamentos
        res = await client_morador.get("/api/v1/apartamentos")
        assert res.status_code == 200

        # 2. Moradores
        res = await client_morador.get("/api/v1/moradores")
        assert res.status_code == 200

        # 3. Proprietários
        res = await client_morador.get("/api/v1/proprietarios")
        assert res.status_code == 200

        # 4. Receitas
        res = await client_morador.get("/api/v1/receitas")
        assert res.status_code == 200

        # 5. Despesas
        res = await client_morador.get("/api/v1/despesas")
        assert res.status_code == 200

        # 6. Cobranças
        res = await client_morador.get("/api/v1/cobrancas")
        assert res.status_code == 200

        # 7. Gás
        res = await client_morador.get("/api/v1/gas")
        assert res.status_code == 200

        # 8. Rateio de Água
        res = await client_morador.get("/api/v1/agua")
        assert res.status_code == 200

        # 9. Assembleias
        res = await client_morador.get("/api/v1/assembleias")
        assert res.status_code == 200

        # 10. Avisos
        res = await client_morador.get("/api/v1/avisos")
        assert res.status_code == 200

        # 11. Documentos
        res = await client_morador.get("/api/v1/documentos")
        assert res.status_code == 200

        # 12. Inadimplência
        res = await client_morador.get("/api/v1/inadimplencia/cobrancas-atrasadas")
        assert res.status_code == 200

        # 13. Relatórios Balancete
        res = await client_morador.get("/api/v1/relatorios/balancete?mes=9&ano=2026&formato=excel")
        assert res.status_code == 200

    async def test_morador_blocked_from_modifications(self, client_morador: AsyncClient):
        """Morador must receive 403 Forbidden when trying to create, edit or delete records."""
        # 1. Attempt to create an apartamento
        res = await client_morador.post(
            "/api/v1/apartamentos",
            json={"numero": "999", "bloco": "Z", "tipo": "padrao", "status": "vazio"},
        )
        assert res.status_code == 403

        # 2. Attempt to create a receita
        res = await client_morador.post(
            "/api/v1/receitas",
            json={"descricao": "Taxa Extra", "categoria": "taxa", "competencia": "2026-09-01", "valor": 100.0, "status": "pendente"},
        )
        assert res.status_code == 403

        # 3. Attempt to create a despesa
        res = await client_morador.post(
            "/api/v1/despesas",
            json={"descricao": "Conta de Luz", "tipo": "ordinaria", "competencia": "2026-09-01", "valor": 500.0, "status": "pendente"},
        )
        assert res.status_code == 403

        # 4. Attempt to create an assembleia
        res = await client_morador.post(
            "/api/v1/assembleias",
            json={"titulo": "Reunião Não Autorizada", "data": "2026-10-01", "pautas": []},
        )
        assert res.status_code == 403

        # 5. Attempt to create an aviso
        res = await client_morador.post(
            "/api/v1/avisos",
            json={"titulo": "Aviso Não Autorizado", "descricao": "Teste de morador"},
        )
        assert res.status_code == 403

        # 6. Attempt to access administrative modules (Usuarios & Auditoria)
        res_usr = await client_morador.get("/api/v1/usuarios")
        assert res_usr.status_code == 403

        res_aud = await client_morador.get("/api/v1/auditoria")
        assert res_aud.status_code == 403

    async def test_proprietario_can_read_and_is_blocked_from_write(self, client_proprietario: AsyncClient):
        """Proprietário also has read-only access and is blocked from writes."""
        res_read = await client_proprietario.get("/api/v1/receitas")
        assert res_read.status_code == 200

        res_write = await client_proprietario.post(
            "/api/v1/receitas",
            json={"descricao": "Tentativa", "categoria": "taxa", "competencia": "2026-09-01", "valor": 100.0, "status": "pendente"},
        )
        assert res_write.status_code == 403

    async def test_admin_has_full_access(self, client_admin: AsyncClient):
        """Admin (Síndico) can read and write without restrictions."""
        # Read
        res_read = await client_admin.get("/api/v1/receitas")
        assert res_read.status_code == 200

        # Read usuarios
        res_usr = await client_admin.get("/api/v1/usuarios")
        assert res_usr.status_code == 200

        # Create aviso
        res_create = await client_admin.post(
            "/api/v1/avisos",
            json={"titulo": "Aviso do Síndico", "descricao": "Publicação com permissão total."},
        )
        assert res_create.status_code == 201
        aviso_id = res_create.json()["id"]

        # Delete aviso
        res_del = await client_admin.delete(f"/api/v1/avisos/{aviso_id}")
        assert res_del.status_code == 204
