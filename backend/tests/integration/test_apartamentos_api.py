"""Integration tests for /api/v1/apartamentos endpoints."""
import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient


class TestListApartamentos:
    async def test_list_empty(self, client_admin: AsyncClient):
        response = await client_admin.get("/api/v1/apartamentos")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []
        assert data["page"] == 1

    async def test_list_pagination(self, client_admin: AsyncClient):
        # Create 3 apartamentos via API
        for i in range(3):
            await client_admin.post("/api/v1/apartamentos", json={
                "numero": f"{100 + i}", "bloco": "A", "tipo": "padrao", "status": "vazio",
            })

        response = await client_admin.get("/api/v1/apartamentos", params={"page": 1, "page_size": 2})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 2
        assert data["total_pages"] == 2


class TestCreateApartamento:
    async def test_create_minimal(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "101", "tipo": "padrao", "status": "vazio",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["numero"] == "101"
        assert data["tipo"] == "padrao"
        assert data["status"] == "vazio"
        assert "id" in data

    async def test_create_full(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "202", "bloco": "B", "tipo": "cobertura",
            "fracao_ideal": 0.5, "metragem": 150.0, "vaga_demarcada": "Vaga 10",
            "status": "ocupado",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["fracao_ideal"] == 0.5
        assert data["metragem"] == 150.0

    async def test_create_invalid_data(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/apartamentos", json={
            "tipo": "invalido",
        })
        assert response.status_code == 422


class TestGetApartamento:
    async def test_get_by_id(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "303", "tipo": "padrao", "status": "vazio",
        })
        created = create_resp.json()

        response = await client_admin.get(f"/api/v1/apartamentos/{created['id']}")
        assert response.status_code == 200
        assert response.json()["numero"] == "303"

    async def test_get_not_found(self, client_admin: AsyncClient):
        response = await client_admin.get(f"/api/v1/apartamentos/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateApartamento:
    async def test_update(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "404", "tipo": "padrao", "status": "vazio",
        })
        created = create_resp.json()

        response = await client_admin.put(f"/api/v1/apartamentos/{created['id']}", json={
            "status": "ocupado", "bloco": "C",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ocupado"
        assert data["bloco"] == "C"

    async def test_update_not_found(self, client_admin: AsyncClient):
        response = await client_admin.put(f"/api/v1/apartamentos/{uuid.uuid4()}", json={
            "numero": "999",
        })
        assert response.status_code == 404


class TestDeleteApartamento:
    async def test_delete(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "505", "tipo": "padrao", "status": "vazio",
        })
        created = create_resp.json()

        response = await client_admin.delete(f"/api/v1/apartamentos/{created['id']}")
        assert response.status_code == 204

        # Verify deletion
        get_resp = await client_admin.get(f"/api/v1/apartamentos/{created['id']}")
        assert get_resp.status_code == 404

    async def test_delete_not_found(self, client_admin: AsyncClient):
        response = await client_admin.delete(f"/api/v1/apartamentos/{uuid.uuid4()}")
        assert response.status_code == 404


class TestMoradoresDoApartamento:
    async def test_list_moradores_empty(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "601", "tipo": "padrao", "status": "vazio",
        })
        created = create_resp.json()

        response = await client_admin.get(f"/api/v1/apartamentos/{created['id']}/moradores")
        assert response.status_code == 200
        assert response.json() == []
