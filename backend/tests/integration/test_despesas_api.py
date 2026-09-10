"""Integration tests for /api/v1/despesas endpoints."""
import uuid
from datetime import date

import pytest
from httpx import AsyncClient


class TestListDespesas:
    async def test_list_empty(self, client_admin: AsyncClient):
        response = await client_admin.get("/api/v1/despesas")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0

    async def test_list_filter_month_year(self, client_admin: AsyncClient):
        await client_admin.post("/api/v1/despesas", json={
            "descricao": "Despesa Jan 2024", "valor": 300.00, "competencia": "2024-01-10",
        })
        await client_admin.post("/api/v1/despesas", json={
            "descricao": "Despesa Fev 2024", "valor": 400.00, "competencia": "2024-02-15",
        })
        # Filtrar mes=1 e ano=2024
        resp = await client_admin.get("/api/v1/despesas?mes=1&ano=2024")
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["descricao"] == "Despesa Jan 2024"



class TestCreateDespesa:
    async def test_create_minimal(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/despesas", json={
            "descricao": "Conta de Luz",
            "valor": 150.50,
            "competencia": "2024-01-01",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["descricao"] == "Conta de Luz"
        assert float(data["valor"]) == 150.50
        assert data["tipo"] == "ordinaria"
        assert data["status"] == "pendente"

    async def test_create_com_parcelamento(self, client_admin: AsyncClient):
        """Testa criação de despesa com parcelamento."""
        response = await client_admin.post("/api/v1/despesas", json={
            "descricao": "Obra Reforma",
            "valor": 6000.00,
            "competencia": "2024-01-01",
            "tipo": "extraordinaria",
            "parcelamento": True,
            "total_parcelas": 6,
        })
        assert response.status_code == 201
        data = response.json()
        assert data["parcelamento"] is True
        assert data["total_parcelas"] == 6

    async def test_create_validation_error(self, client_admin: AsyncClient):
        response = await client_admin.post("/api/v1/despesas", json={
            "descricao": "Teste",
            # Missing required: valor, competencia
        })
        assert response.status_code == 422


class TestGetDespesa:
    async def test_get_by_id(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/despesas", json={
            "descricao": "Água", "valor": 200.00, "competencia": "2024-01-01",
        })
        created = create_resp.json()

        response = await client_admin.get(f"/api/v1/despesas/{created['id']}")
        assert response.status_code == 200
        assert response.json()["descricao"] == "Água"

    async def test_get_not_found(self, client_admin: AsyncClient):
        response = await client_admin.get(f"/api/v1/despesas/{uuid.uuid4()}")
        assert response.status_code == 404


class TestUpdateDespesa:
    async def test_update(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/despesas", json={
            "descricao": "Luz", "valor": 100.00, "competencia": "2024-01-01",
        })
        created = create_resp.json()

        response = await client_admin.put(f"/api/v1/despesas/{created['id']}", json={
            "descricao": "Energia Elétrica", "status": "pago",
        })
        assert response.status_code == 200
        assert response.json()["descricao"] == "Energia Elétrica"
        assert response.json()["status"] == "pago"


class TestDeleteDespesa:
    async def test_delete(self, client_admin: AsyncClient):
        create_resp = await client_admin.post("/api/v1/despesas", json={
            "descricao": "Gas", "valor": 50.00, "competencia": "2024-01-01",
        })
        created = create_resp.json()

        response = await client_admin.delete(f"/api/v1/despesas/{created['id']}")
        assert response.status_code == 204

        get_resp = await client_admin.get(f"/api/v1/despesas/{created['id']}")
        assert get_resp.status_code == 404
