"""Unit tests for service layer — all DB calls mocked."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, ANY

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.services import (
    apartamento_service,
    proprietario_service,
    morador_service,
    despesa_service,
    receita_service,
    auth_service,
)
from app.models.apartamento import Apartamento, TipoApartamento, StatusApartamento
from app.models.proprietario import Proprietario
from app.models.morador import Morador, TipoMorador
from app.models.despesa import Despesa, TipoDespesa
from app.models.receita import Receita, StatusFinanceiro
from app.models.usuario import Usuario, RoleUsuario


# ── Helpers ────────────────────────────────────────────────────────

def make_mock_result(scalar_one_or_none_return=None, scalars_all_return=None):
    """Create a mock execute result. SyncMock for sync methods like scalar_one_or_none."""
    from unittest.mock import MagicMock
    result = MagicMock()  # Use MagicMock NOT AsyncMock — scalar_one_or_none is sync
    result.scalar_one_or_none.return_value = scalar_one_or_none_return
    if scalars_all_return is not None:
        result.scalars.return_value.all.return_value = scalars_all_return
    return result


# ── ApartamentoService ─────────────────────────────────────────────

class TestApartamentoService:
    async def test_create(self, mock_db):
        data = {"numero": "101", "tipo": "padrao", "status": "vazio"}
        apto = await apartamento_service.create_apartamento(mock_db, data)
        assert mock_db.add.call_count >= 1
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
        assert isinstance(apto, Apartamento)

    async def test_get_found(self, mock_db):
        apto_id = str(uuid.uuid4())
        expected = Apartamento(id=uuid.UUID(apto_id), numero="101")
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=expected)

        result = await apartamento_service.get_apartamento(mock_db, apto_id)
        assert result.numero == "101"
        mock_db.execute.assert_awaited_once()

    async def test_get_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException) as exc:
            await apartamento_service.get_apartamento(mock_db, str(uuid.uuid4()))
        assert exc.value.status_code == 404

    async def test_list_returns_query(self, mock_db):
        query = await apartamento_service.list_apartamentos(mock_db)
        assert query is not None

    async def test_list_with_filters(self, mock_db):
        query = await apartamento_service.list_apartamentos(
            mock_db, search="101", tipo="padrao", status="vazio"
        )
        assert query is not None

    async def test_update(self, mock_db):
        apto_id = str(uuid.uuid4())
        existing = Apartamento(id=uuid.UUID(apto_id), numero="101", status=StatusApartamento.vazio)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=existing)

        await apartamento_service.update_apartamento(mock_db, apto_id, {"status": "ocupado"})
        # The real instance is mutated by setattr, then committed
        assert existing.status == StatusApartamento.ocupado
        mock_db.commit.assert_awaited_once()

    async def test_delete(self, mock_db):
        apto_id = str(uuid.uuid4())
        existing = Apartamento(id=uuid.UUID(apto_id), numero="101")
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=existing)

        await apartamento_service.delete_apartamento(mock_db, apto_id)
        mock_db.delete.assert_called_once_with(existing)
        mock_db.commit.assert_awaited_once()

    async def test_delete_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException) as exc:
            await apartamento_service.delete_apartamento(mock_db, str(uuid.uuid4()))
        assert exc.value.status_code == 404

    async def test_get_peso(self):
        assert apartamento_service.get_peso("padrao") == 1.0
        assert apartamento_service.get_peso("area_privativa") == 1.5
        assert apartamento_service.get_peso("cobertura") == 2.0
        assert apartamento_service.get_peso("invalido") == 1.0  # default


# ── ProprietarioService ────────────────────────────────────────────

class TestProprietarioService:
    async def test_create(self, mock_db):
        # First query (CPF check) returns None (no duplicate)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)

        data = {"nome": "João", "cpf": "12345678901"}
        prop = await proprietario_service.create_proprietario(mock_db, data)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    async def test_create_duplicate_cpf(self, mock_db):
        existing = Proprietario(id=uuid.uuid4(), nome="Existente", cpf="12345678901")
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=existing)

        with pytest.raises(HTTPException) as exc:
            await proprietario_service.create_proprietario(mock_db, {"nome": "João", "cpf": "12345678901"})
        assert exc.value.status_code == 400
        assert "CPF" in str(exc.value.detail)

    async def test_get_found(self, mock_db):
        prop = Proprietario(id=uuid.uuid4(), nome="João", cpf="12345678901")
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=prop)

        result = await proprietario_service.get_proprietario(mock_db, str(prop.id))
        assert result.nome == "João"

    async def test_get_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException) as exc:
            await proprietario_service.get_proprietario(mock_db, str(uuid.uuid4()))
        assert exc.value.status_code == 404

    async def test_update(self, mock_db):
        prop = Proprietario(id=uuid.uuid4(), nome="João", cpf="12345678901")
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=prop)

        result = await proprietario_service.update_proprietario(mock_db, str(prop.id), {"nome": "João Silva"})
        assert result is not None
        mock_db.commit.assert_awaited_once()

    async def test_delete(self, mock_db):
        prop = Proprietario(id=uuid.uuid4(), nome="João", cpf="12345678901")
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=prop)

        await proprietario_service.delete_proprietario(mock_db, str(prop.id))
        mock_db.delete.assert_called_once()

    async def test_list_returns_query(self, mock_db):
        query = await proprietario_service.list_proprietarios(mock_db)
        assert query is not None


# ── MoradorService ─────────────────────────────────────────────────

class TestMoradorService:
    async def test_create(self, mock_db):
        data = {"nome": "Maria", "tipo": "morador"}
        morador = await morador_service.create_morador(mock_db, data)
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()

    async def test_get_found(self, mock_db):
        m = Morador(id=uuid.uuid4(), nome="Maria", tipo=TipoMorador.morador)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=m)

        result = await morador_service.get_morador(mock_db, str(m.id))
        assert result.nome == "Maria"

    async def test_get_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException):
            await morador_service.get_morador(mock_db, str(uuid.uuid4()))

    async def test_update(self, mock_db):
        m = Morador(id=uuid.uuid4(), nome="Maria", tipo=TipoMorador.morador)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=m)

        await morador_service.update_morador(mock_db, str(m.id), {"nome": "Maria S."})
        mock_db.commit.assert_awaited_once()

    async def test_delete(self, mock_db):
        m = Morador(id=uuid.uuid4(), nome="Maria", tipo=TipoMorador.morador)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=m)

        await morador_service.delete_morador(mock_db, str(m.id))
        mock_db.delete.assert_called_once()

    async def test_list_returns_query(self, mock_db):
        query = await morador_service.list_moradores(mock_db)
        assert query is not None

    async def test_list_filtered(self, mock_db):
        query = await morador_service.list_moradores(mock_db, search="Maria", tipo="morador")
        assert query is not None

    async def test_vincular_apartamento(self, mock_db):
        from app.models.apartamento_morador import ApartamentoMorador
        data = {"apartamento_id": uuid.uuid4(), "data_inicio": date(2024, 1, 1)}
        vinculo = await morador_service.vincular_apartamento(mock_db, str(uuid.uuid4()), data)
        mock_db.add.assert_called_once()
        assert isinstance(vinculo, ApartamentoMorador)

    async def test_desvincular_apartamento(self, mock_db):
        vinculo = MagicMock()
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=vinculo)

        await morador_service.desvincular_apartamento(mock_db, str(uuid.uuid4()), str(uuid.uuid4()))
        mock_db.delete.assert_called_once_with(vinculo)


# ── DespesaService ─────────────────────────────────────────────────

class TestDespesaService:
    async def test_create(self, mock_db):
        data = {
            "descricao": "Conta de Luz", "valor": 150.00,
            "competencia": date(2024, 1, 1),
        }
        desp = await despesa_service.create_despesa(mock_db, data)
        assert mock_db.add.call_count >= 1
        mock_db.commit.assert_called_once()

    async def test_create_com_parcelas(self, mock_db):
        data = {
            "descricao": "Obra", "valor": 3000.00,
            "competencia": date(2024, 1, 1),
            "tipo": "extraordinaria",
            "parcelamento": True,
            "total_parcelas": 3,
        }
        desp = await despesa_service.create_despesa(mock_db, data)
        mock_db.add.assert_called()

    async def test_get_found(self, mock_db):
        d = Despesa(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=d)

        result = await despesa_service.get_despesa(mock_db, str(d.id))
        assert result.descricao == "Teste"

    async def test_get_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException):
            await despesa_service.get_despesa(mock_db, str(uuid.uuid4()))

    async def test_update(self, mock_db):
        d = Despesa(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=d)

        await despesa_service.update_despesa(mock_db, str(d.id), {"descricao": "Atualizado"})
        mock_db.commit.assert_awaited_once()

    async def test_delete(self, mock_db):
        d = Despesa(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=d)

        await despesa_service.delete_despesa(mock_db, str(d.id))
        mock_db.delete.assert_called_once()

    async def test_upload_comprovante(self, mock_db, monkeypatch):
        d = Despesa(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=d)
        
        async def mock_save_upload(file, subfolder):
            return "/uploads/comprovantes/recibo.pdf"
        monkeypatch.setattr("app.utils.file_storage.save_upload", mock_save_upload)

        mock_file = MagicMock()
        mock_file.filename = "recibo.pdf"
        mock_file.size = 1024
        mock_file.content_type = "application/pdf"
        updated = await despesa_service.upload_comprovante_despesa(
            mock_db, str(d.id), mock_file, data_pagamento=date(2026, 9, 10)
        )
        assert updated.status == "pago"
        assert updated.comprovante_url == "/uploads/comprovantes/recibo.pdf"
        assert updated.comprovante_nome == "recibo.pdf"
        mock_db.commit.assert_awaited()


# ── ReceitaService ─────────────────────────────────────────────────

class TestReceitaService:
    async def test_create(self, mock_db):
        data = {
            "descricao": "Aluguel", "valor": 2000.00,
            "competencia": date(2024, 1, 1),
        }
        rec = await receita_service.create_receita(mock_db, data)
        assert mock_db.add.call_count >= 1
        mock_db.commit.assert_called_once()

    async def test_get_found(self, mock_db):
        r = Receita(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=r)

        result = await receita_service.get_receita(mock_db, str(r.id))
        assert result.descricao == "Teste"

    async def test_get_not_found(self, mock_db):
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException):
            await receita_service.get_receita(mock_db, str(uuid.uuid4()))

    async def test_update(self, mock_db):
        r = Receita(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=r)

        await receita_service.update_receita(mock_db, str(r.id), {"descricao": "Novo"})
        mock_db.commit.assert_awaited_once()

    async def test_delete(self, mock_db):
        r = Receita(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=r)

        await receita_service.delete_receita(mock_db, str(r.id))
        mock_db.delete.assert_called_once()

    async def test_upload_comprovante(self, mock_db, monkeypatch):
        r = Receita(id=uuid.uuid4(), descricao="Teste", valor=100)
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=r)
        
        async def mock_save_upload(file, subfolder):
            return "/uploads/comprovantes/recibo.pdf"
        monkeypatch.setattr("app.utils.file_storage.save_upload", mock_save_upload)

        mock_file = MagicMock()
        mock_file.filename = "recibo.pdf"
        mock_file.size = 1024
        mock_file.content_type = "application/pdf"
        updated = await receita_service.upload_comprovante_receita(
            mock_db, str(r.id), mock_file, data_recebimento=date(2026, 9, 10)
        )
        assert updated.status == "pago"
        assert updated.comprovante_url == "/uploads/comprovantes/recibo.pdf"
        assert updated.comprovante_nome == "recibo.pdf"
        mock_db.commit.assert_awaited()


# ── CobrancaService ────────────────────────────────────────────────

class TestCobrancaService:
    async def test_pagar_cobranca(self, mock_db):
        from app.services import cobranca_service
        from app.models.cobranca import Cobranca
        cob_id = str(uuid.uuid4())
        cob = Cobranca(
            id=uuid.UUID(cob_id),
            apartamento_id=uuid.uuid4(),
            descricao="Taxa 101",
            competencia=date(2024, 1, 1),
            vencimento=date(2024, 1, 10),
            valor=Decimal("350.00"),
            valor_total=Decimal("350.00"),
            status=StatusFinanceiro.pendente,
        )
        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=cob)

        res = await cobranca_service.pagar_cobranca(mock_db, cob_id)
        assert res.status == "pago"
        assert res.data_pagamento == date.today()
        mock_db.commit.assert_awaited_once()

    async def test_gerar_cobrancas_mensais_completo(self, mock_db):
        from app.services import cobranca_service
        from app.models.cobranca import Cobranca
        from app.models.despesa import Despesa
        from app.models.agua_rateio import AguaRateio
        from app.models.agua_rateio_apartamento import AguaRateioApartamento
        from app.models.leitura_gas import LeituraGas

        apto1 = Apartamento(id=uuid.uuid4(), numero="101", fracao_ideal=Decimal("0.6000"))
        apto2 = Apartamento(id=uuid.uuid4(), numero="201", fracao_ideal=Decimal("0.4000"))

        desp1 = Despesa(id=uuid.uuid4(), descricao="Limpeza", valor=Decimal("500.00"), competencia=date(2026, 9, 1), parcelamento=False)
        rateio_agua = AguaRateio(id=uuid.uuid4(), competencia=date(2026, 9, 1), valor_total=Decimal("200.00"))
        det_agua1 = AguaRateioApartamento(apartamento_id=apto1.id, rateio_id=rateio_agua.id, valor_calculado=Decimal("120.00"))
        det_agua2 = AguaRateioApartamento(apartamento_id=apto2.id, rateio_id=rateio_agua.id, valor_calculado=Decimal("80.00"))
        gas1 = LeituraGas(apartamento_id=apto1.id, competencia=date(2026, 9, 1), leitura_atual=Decimal("10.0"), valor_cobrado=Decimal("50.00"))
        gas2 = LeituraGas(apartamento_id=apto2.id, competencia=date(2026, 9, 1), leitura_atual=Decimal("5.0"), valor_cobrado=Decimal("30.00"))

        mock_db.execute.side_effect = [
            make_mock_result(scalars_all_return=[apto1, apto2]), # aptos
            make_mock_result(scalars_all_return=[desp1]), # despesas unicas
            make_mock_result(scalars_all_return=[]), # despesas parcelas
            make_mock_result(scalar_one_or_none_return=rateio_agua), # rateio agua
            make_mock_result(scalars_all_return=[det_agua1, det_agua2]), # rateio agua detalhes
            make_mock_result(scalars_all_return=[gas1, gas2]), # leituras gas
            make_mock_result(scalars_all_return=[]), # existentes
            make_mock_result(scalars_all_return=[]), # recarregadas
        ]

        data = {
            "competencia": date(2026, 9, 1),
            "vencimento": date(2026, 9, 10),
            "valor_base_condominio": 0.0,
            "incluir_despesas": True,
            "incluir_agua": True,
            "incluir_gas": True,
        }

        res = await cobranca_service.gerar_cobrancas_mensais(mock_db, data)
        assert res["total_despesas_mes"] == 500.0
        assert res["total_agua"] == 200.0
        assert res["total_gas"] == 80.0
        assert res["total_valor"] == 780.0
        mock_db.commit.assert_awaited()



# ── AguaRateioService ──────────────────────────────────────────────

class TestAguaRateioService:
    async def test_create_rateio_fracao_ideal(self, mock_db):
        from app.services import agua_rateio_service
        from app.models.agua_rateio import AguaRateio
        from app.models.agua_rateio_apartamento import AguaRateioApartamento

        apto1 = Apartamento(id=uuid.uuid4(), numero="101", fracao_ideal=Decimal("0.6000"))
        apto2 = Apartamento(id=uuid.uuid4(), numero="201", fracao_ideal=Decimal("0.4000"))

        mock_db.execute.side_effect = [
            make_mock_result(scalar_one_or_none_return=None),  # check existing
            make_mock_result(scalars_all_return=[apto1, apto2]),  # get aptos
            make_mock_result(scalar_one_or_none_return=AguaRateio(
                id=uuid.uuid4(),
                competencia=date(2026, 9, 1),
                valor_total=Decimal("1000.00"),
                apartamentos=[
                    AguaRateioApartamento(apartamento_id=apto1.id, peso=Decimal("0.6000"), soma_pesos=Decimal("1.0000"), valor_calculado=Decimal("600.00")),
                    AguaRateioApartamento(apartamento_id=apto2.id, peso=Decimal("0.4000"), soma_pesos=Decimal("1.0000"), valor_calculado=Decimal("400.00")),
                ]
            ))
        ]

        data = {
            "competencia": date(2026, 9, 1),
            "valor_total": 1000.00,
            "observacao": "Rateio Set/2026",
        }

        res = await agua_rateio_service.create_rateio(mock_db, data)
        assert res is not None
        assert mock_db.add.call_count >= 3  # 1 rateio + 2 details
        mock_db.commit.assert_awaited_once()

    async def test_create_rateio_duplicated_competencia(self, mock_db):
        from app.services import agua_rateio_service
        from app.models.agua_rateio import AguaRateio

        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=AguaRateio(competencia=date(2026, 9, 1), valor_total=100))

        data = {"competencia": date(2026, 9, 1), "valor_total": 500.0}
        with pytest.raises(HTTPException) as exc:
            await agua_rateio_service.create_rateio(mock_db, data)
        assert exc.value.status_code == 400
        assert "Já existe rateio" in exc.value.detail

    async def test_get_rateio_not_found(self, mock_db):
        from app.services import agua_rateio_service

        mock_db.execute.return_value = make_mock_result(scalar_one_or_none_return=None)
        with pytest.raises(HTTPException) as exc:
            await agua_rateio_service.get_rateio(mock_db, str(uuid.uuid4()))
        assert exc.value.status_code == 404


