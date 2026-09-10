"""Integration tests for /api/v1/proprietarios endpoints."""
import uuid

import pytest
from httpx import AsyncClient


class TestListProprietarios:
    async def test_list_empty(self, client_admin: AsyncClient):
        response = await client_admin.get("/api/v1/proprietarios")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    async def test_list_with_data(self, client_admin: AsyncClient):
        await client_admin.post("/api/v1/proprietarios", json={
            "nome": "João", "cpf": "11111111111",
        })
        await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Maria", "cpf": "22222222222",
        })

        response = await client_admin.get("/api/v1/proprietarios")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2


class TestCreateProprietario:
    async def test_create_minimal(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Carlos", "cpf": "33333333333",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["nome"] == "Carlos"
        assert "id" in data

    async def test_create_with_all_fields(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Ana", "cpf": "44444444444",
            "telefone": "11999999999", "email": "ana@email.com",
        })
        assert response.status_code == 201
        assert response.json()["telefone"] == "11999999999"

    async def test_create_duplicate_cpf(self, client_admin: AsyncClient):
        await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Primeiro", "cpf": "55555555555",
        })
        response = await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Segundo", "cpf": "55555555555",
        })
        assert response.status_code == 400

    async def test_create_missing_required(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/proprietarios", json={})
        assert response.status_code == 422


class TestGetProprietario:
    async def test_get_by_id(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Pedro", "cpf": "66666666666",
        })
        created = create_resp.json()

        response = await client_admin.get(f"/api/v1/proprietarios/{created['id']}")
        assert response.status_code == 200
        assert response.json()["nome"] == "Pedro"

    async def test_get_not_found(self, client_admin: AsyncClient):
        response = await client_admin.get(f"/api/v1/proprietarios/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateProprietario:
    async def test_update(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Lucas", "cpf": "77777777777",
        })
        created = create_resp.json()

        response = await client_admin.put(f"/api/v1/proprietarios/{created['id']}", json={
            "nome": "Lucas Atualizado", "telefone": "11988888888",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["nome"] == "Lucas Atualizado"
        assert data["telefone"] == "11988888888"


class TestDeleteProprietario:
    async def test_delete(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/proprietarios", json={
            "nome": "Rafael", "cpf": "88888888888",
        })
        created = create_resp.json()

        response = await client_admin.delete(f"/api/v1/proprietarios/{created['id']}")
        assert response.status_code == 204

        get_resp = await client_admin.get(f"/api/v1/proprietarios/{created['id']}")
        assert get_resp.status_code == 404
