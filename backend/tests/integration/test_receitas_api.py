"""Integration tests for /api/v1/receitas endpoints."""
import uuid
from datetime import date

import pytest
from httpx import AsyncClient


class TestListReceitas:
    async def test_list_empty(self, client_admin: AsyncClient):
        response = await client_admin.get("/api/v1/receitas")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    async def test_list_filter_month_year(self, client_admin: AsyncClient):
        await client_admin.post("/api/v1/receitas", json={
            "descricao": "Receita Jan 2024", "valor": 500.00, "competencia": "2024-01-10",
        })
        await client_admin.post("/api/v1/receitas", json={
            "descricao": "Receita Fev 2024", "valor": 600.00, "competencia": "2024-02-15",
        })
        # Filtrar mes=1 e ano=2024
        resp = await client_admin.get("/api/v1/receitas?mes=1&ano=2024")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["descricao"] == "Receita Jan 2024"



class TestCreateReceita:
    async def test_create_minimal(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/receitas", json={
            "descricao": "Aluguel",
            "valor": 2000.00,
            "competencia": "2024-01-01",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["descricao"] == "Aluguel"
        assert data["tipo"] == "condominio"

    async def test_create_full(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/receitas", json={
            "descricao": "Taxa Extra Obra",
            "valor": 500.00,
            "competencia": "2024-02-01",
            "tipo": "taxa_extra",
            "categoria": "Obras",
            "status": "pendente",
        })
        assert response.status_code == 201
        assert response.json()["tipo"] == "taxa_extra"


class TestGetReceita:
    async def test_get_by_id(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/receitas", json={
            "descricao": "Condomínio", "valor": 800.00, "competencia": "2024-01-01",
        })
        created = create_resp.json()

        response = await client_admin.get(f"/api/v1/receitas/{created['id']}")
        assert response.status_code == 200

    async def test_get_not_found(self, client_admin: AsyncClient):
        response = await client_admin.get(f"/api/v1/receitas/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateReceita:
    async def test_update(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/receitas", json={
            "descricao": "Aluguel", "valor": 2000.00, "competencia": "2024-01-01",
        })
        created = create_resp.json()

        response = await client_admin.put(f"/api/v1/receitas/{created['id']}", json={
            "status": "pago", "data_recebimento": "2024-01-05",
        })
        assert response.status_code == 200
        assert response.json()["status"] == "pago"


class TestDeleteReceita:
    async def test_delete(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/receitas", json={
            "descricao": "Fundo Reserva", "valor": 300.00, "competencia": "2024-01-01",
        })
        created = create_resp.json()

        response = await client_admin.delete(f"/api/v1/receitas/{created['id']}")
        assert response.status_code == 204

        get_resp = await client_admin.get(f"/api/v1/receitas/{created['id']}")
        assert get_resp.status_code == 404
