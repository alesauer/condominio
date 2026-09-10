"""Integration tests for /api/v1/moradores endpoints."""
import uuid

import pytest
from httpx import AsyncClient


class TestListMoradores:
    async def test_list_empty(self, client_admin: AsyncClient):
        response = await client_admin.get("/api/v1/moradores")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    async def test_list_with_filters(self, client_admin: AsyncClient):
        await client_admin.post("/api/v1/moradores", json={
            "nome": "João", "tipo": "morador",
        })
        await client_admin.post("/api/v1/moradores", json={
            "nome": "Maria", "tipo": "inquilino",
        })

        # Filter by tipo
        response = await client_admin.get("/api/v1/moradores", params={"tipo": "inquilino"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["nome"] == "Maria"


class TestCreateMorador:
    async def test_create_minimal(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/moradores", json={
            "nome": "Carlos", "tipo": "morador",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nome"] == "Carlos"
        assert data["tipo"] == "morador"

    async def test_create_full(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/moradores", json={
            "nome": "Ana", "cpf": "12345678900", "telefone": "11999999999",
            "email": "ana@email.com", "veiculo": "ABC-1234", "tipo": "dependente",
        })
        assert response.status_code == 201
        assert response.json()["cpf"] == "12345678900"


class TestGetMorador:
    async def test_get_by_id(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/moradores", json={
            "nome": "Pedro", "tipo": "morador",
        })
        created = create_resp.json()

        response = await client_admin.get(f"/api/v1/moradores/{created['id']}")
        assert response.status_code == 200
        assert response.json()["nome"] == "Pedro"

    async def test_get_not_found(self, client_admin: AsyncClient):
        response = await client_admin.get(f"/api/v1/moradores/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateMorador:
    async def test_update(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/moradores", json={
            "nome": "Lucas", "tipo": "morador",
        })
        created = create_resp.json()

        response = await client_admin.put(f"/api/v1/moradores/{created['id']}", json={
            "nome": "Lucas Atualizado", "tipo": "inquilino",
        })
        assert response.status_code == 200
        assert response.json()["nome"] == "Lucas Atualizado"


class TestDeleteMorador:
    async def test_delete(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/moradores", json={
            "nome": "Rafael", "tipo": "morador",
        })
        created = create_resp.json()

        response = await client_admin.delete(f"/api/v1/moradores/{created['id']}")
        assert response.status_code == 204

        get_resp = await client_admin.get(f"/api/v1/moradores/{created['id']}")
        assert get_resp.status_code == 404
