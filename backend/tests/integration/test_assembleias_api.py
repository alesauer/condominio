"""Integration tests for /api/v1/assembleias endpoints."""
import uuid
import pytest
from httpx import AsyncClient


class TestAssembleiasAPI:
    async def test_create_and_delete_assembleia_with_pautas(self, client_admin: AsyncClient):
        # 1. Create assembleia with pautas
        create_resp = await client_admin.post(
            "/api/v1/assembleias",
            json={
                "data": "2026-10-15",
                "titulo": "Assembleia Geral Ordinária",
                "descricao": "Aprovação de contas e eleição de síndico",
                "local": "Salão de Festas",
                "pautas": [
                    {"ordem": 1, "descricao": "Prestação de contas anual"},
                    {"ordem": 2, "descricao": "Eleição do corpo diretivo"},
                ],
            },
        )
        assert create_resp.status_code == 201
        data = create_resp.json()
        assert data["titulo"] == "Assembleia Geral Ordinária"
        assembleia_id = data["id"]

        # 2. Get assembleia
        get_resp = await client_admin.get(f"/api/v1/assembleias/{assembleia_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["id"] == assembleia_id

        # 3. Delete assembleia
        del_resp = await client_admin.delete(f"/api/v1/assembleias/{assembleia_id}")
        assert del_resp.status_code == 204

        # 4. Verify it's gone
        get_after_del = await client_admin.get(f"/api/v1/assembleias/{assembleia_id}")
        assert get_after_del.status_code == 404

    async def test_create_and_delete_assembleia_with_pautas_and_ata(self, client_admin: AsyncClient):
        # 1. Create assembleia
        create_resp = await client_admin.post(
            "/api/v1/assembleias",
            json={
                "data": "2026-11-20",
                "titulo": "Assembleia Extraordinária",
                "descricao": "Discussão sobre reforma da fachada",
                "local": "Hall Principal",
                "pautas": [
                    {"ordem": 1, "descricao": "Apresentação dos orçamentos"},
                ],
            },
        )
        assert create_resp.status_code == 201
        assembleia_id = create_resp.json()["id"]

        # 2. Delete assembleia
        del_resp = await client_admin.delete(f"/api/v1/assembleias/{assembleia_id}")
        assert del_resp.status_code == 204

        # 3. Verify it's gone
        get_after_del = await client_admin.get(f"/api/v1/assembleias/{assembleia_id}")
        assert get_after_del.status_code == 404

    async def test_delete_not_found(self, client_admin: AsyncClient):
        del_resp = await client_admin.delete(f"/api/v1/assembleias/{uuid.uuid4()}")
        assert del_resp.status_code == 404

    async def test_delete_invalid_uuid(self, client_admin: AsyncClient):
        del_resp = await client_admin.delete("/api/v1/assembleias/not-a-valid-uuid")
        assert del_resp.status_code == 404

