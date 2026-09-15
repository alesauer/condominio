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

    async def test_create_assembleia_with_ata_and_upload_file(self, client_admin: AsyncClient):
        # 1. Create assembleia with inline ata text
        create_resp = await client_admin.post(
            "/api/v1/assembleias",
            json={
                "data": "2026-12-05",
                "titulo": "Assembleia de Fim de Ano",
                "descricao": "Balanço geral e confraternização",
                "local": "Churrasqueira",
                "ata_conteudo": "Ata aprovada por unanimidade pelos presentes.",
            },
        )
        assert create_resp.status_code == 201
        data = create_resp.json()
        assembleia_id = data["id"]
        assert data["ata"] is not None
        assert data["ata"]["conteudo"] == "Ata aprovada por unanimidade pelos presentes."

        # 2. Upload file attachment to the assembleia ata
        file_content = b"%PDF-1.4 mock pdf content of assembleia ata"
        files = {"file": ("ata_2026_12_05.pdf", file_content, "application/pdf")}
        data_form = {"conteudo": "Ata final assinada com anexo"}
        upload_resp = await client_admin.post(
            f"/api/v1/assembleias/{assembleia_id}/ata",
            files=files,
            data=data_form,
        )
        assert upload_resp.status_code == 200
        ata_data = upload_resp.json()
        assert ata_data["arquivo_path"] is not None
        assert ata_data["conteudo"] == "Ata final assinada com anexo"

        # 3. Download ata file
        download_resp = await client_admin.get(f"/api/v1/assembleias/{assembleia_id}/ata/download")
        assert download_resp.status_code == 200
        assert download_resp.content == file_content

        # 4. List assembleias and verify ata is present
        list_resp = await client_admin.get("/api/v1/assembleias")
        assert list_resp.status_code == 200
        items = list_resp.json()["items"]
        item = next(i for i in items if i["id"] == assembleia_id)
        assert item["ata"] is not None
        assert item["ata"]["arquivo_path"] is not None

        # 5. Delete ata
        del_ata_resp = await client_admin.delete(f"/api/v1/assembleias/{assembleia_id}/ata")
        assert del_ata_resp.status_code == 204

        # 6. Delete assembleia
        del_resp = await client_admin.delete(f"/api/v1/assembleias/{assembleia_id}")
        assert del_resp.status_code == 204

    async def test_delete_not_found(self, client_admin: AsyncClient):
        del_resp = await client_admin.delete(f"/api/v1/assembleias/{uuid.uuid4()}")
        assert del_resp.status_code == 404

    async def test_delete_invalid_uuid(self, client_admin: AsyncClient):
        del_resp = await client_admin.delete("/api/v1/assembleias/not-a-valid-uuid")
        assert del_resp.status_code == 404


