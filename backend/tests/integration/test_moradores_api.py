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


class TestVincularApartamento:
    async def test_vincular_residente(self, client_admin: AsyncClient):
        # Create morador
        m_res = await client_admin.post("/api/v1/moradores", json={
            "nome": "Morador Vinculo Test", "tipo": "morador",
        })
        morador = m_res.json()

        # Create apto
        a_res = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "101A", "tipo": "padrao", "status": "ocupado",
        })
        apto = a_res.json()

        # Vincular
        v_res = await client_admin.post(f"/api/v1/moradores/{morador['id']}/vincular-apartamento", json={
            "apartamento_id": apto["id"],
            "tipo_vinculo": "residente",
            "definir_como_responsavel": True,
        })
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert len(v_data["apartamentos"]) == 1
        assert v_data["apartamentos"][0]["apartamento_id"] == apto["id"]
        assert v_data["apartamentos"][0]["is_responsavel"] is True

        # Check list moradores do apartamento
        m_apto_res = await client_admin.get(f"/api/v1/apartamentos/{apto['id']}/moradores")
        assert m_apto_res.status_code == 200
        m_list = m_apto_res.json()
        assert len(m_list) == 1
        assert m_list[0]["id"] == morador["id"]

        # Desvincular
        d_res = await client_admin.delete(f"/api/v1/moradores/{morador['id']}/vincular-apartamento/{apto['id']}")
        assert d_res.status_code == 204

        # Check morador has 0 aptos
        m_after = await client_admin.get(f"/api/v1/moradores/{morador['id']}")
        assert len(m_after.json()["apartamentos"]) == 0

        # Check apartamento moradores is empty
        m_apto_empty = await client_admin.get(f"/api/v1/apartamentos/{apto['id']}/moradores")
        assert len(m_apto_empty.json()) == 0

    async def test_vincular_proprietario(self, client_admin: AsyncClient):
        # Create morador
        m_res = await client_admin.post("/api/v1/moradores", json={
            "nome": "Proprietario Vinculo Test", "tipo": "proprietario",
        })
        morador = m_res.json()

        # Create apto
        a_res = await client_admin.post("/api/v1/apartamentos", json={
            "numero": "202B", "tipo": "cobertura", "status": "ocupado",
        })
        apto = a_res.json()

        # Vincular
        v_res = await client_admin.post(f"/api/v1/moradores/{morador['id']}/vincular-apartamento", json={
            "apartamento_id": apto["id"],
            "tipo_vinculo": "proprietario",
            "definir_como_responsavel": True,
        })
        assert v_res.status_code == 200
        v_data = v_res.json()
        assert len(v_data["apartamentos"]) == 1
        assert v_data["apartamentos"][0]["tipo_vinculo"] == "proprietario"

        # Check apto detail
        apto_fetched = await client_admin.get(f"/api/v1/apartamentos/{apto['id']}")
        assert apto_fetched.json()["proprietario_id"] == morador["id"]
        assert apto_fetched.json()["responsavel_id"] == morador["id"]

        # Desvincular
        d_res = await client_admin.delete(f"/api/v1/moradores/{morador['id']}/vincular-apartamento/{apto['id']}")
        assert d_res.status_code == 204

        apto_after = await client_admin.get(f"/api/v1/apartamentos/{apto['id']}")
        assert apto_after.json()["proprietario_id"] is None
        assert apto_after.json()["responsavel_id"] is None

