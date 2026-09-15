"""Integration tests for /api/v1/avisos endpoints."""
import pytest
from httpx import AsyncClient


class TestAvisosAPI:
    async def test_list_and_create_aviso_flow(self, client_admin: AsyncClient):
        # 1. Create a new aviso
        create_res = await client_admin.post(
            "/api/v1/avisos",
            json={
                "titulo": "Aviso de Manutenção Geral",
                "descricao": "Haverá manutenção preventiva no elevador social amanhã das 09h às 12h.",
                "prioridade": "urgente",
                "enviar_email": False,
            },
        )
        assert create_res.status_code == 201
        aviso_data = create_res.json()
        assert aviso_data["titulo"] == "Aviso de Manutenção Geral"
        assert aviso_data["prioridade"] == "urgente"
        assert "id" in aviso_data
        aviso_id = aviso_data["id"]

        # 2. List avisos and verify it appears
        list_res = await client_admin.get("/api/v1/avisos")
        assert list_res.status_code == 200
        list_data = list_res.json()
        assert list_data["total"] >= 1
        found = any(a["id"] == aviso_id for a in list_data["items"])
        assert found is True

        # 3. Get aviso by ID
        get_res = await client_admin.get(f"/api/v1/avisos/{aviso_id}")
        assert get_res.status_code == 200
        assert get_res.json()["titulo"] == "Aviso de Manutenção Geral"

        # 4. Update aviso
        update_res = await client_admin.put(
            f"/api/v1/avisos/{aviso_id}",
            json={
                "titulo": "Aviso de Manutenção Concluída",
                "descricao": "Manutenção finalizada com sucesso.",
                "prioridade": "baixa",
                "enviar_email": False,
            },
        )
        assert update_res.status_code == 200
        assert update_res.json()["titulo"] == "Aviso de Manutenção Concluída"
        assert update_res.json()["prioridade"] == "baixa"

        # 5. Delete aviso
        delete_res = await client_admin.delete(f"/api/v1/avisos/{aviso_id}")
        assert delete_res.status_code == 204

        # 6. Verify it is deleted
        get_after_delete = await client_admin.get(f"/api/v1/avisos/{aviso_id}")
        assert get_after_delete.status_code == 404
