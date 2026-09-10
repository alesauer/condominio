"""Tests for Pydantic schemas — validation, field types, and serialization."""
import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.schemas.apartamento import ApartamentoCreate, ApartamentoUpdate, ApartamentoResponse, ApartamentoListResponse
from app.schemas.proprietario import ProprietarioCreate, ProprietarioUpdate, ProprietarioResponse
from app.schemas.morador import MoradorCreate, MoradorUpdate, MoradorResponse, VincularApartamento
from app.schemas.despesa import DespesaCreate, DespesaUpdate, DespesaResponse, DespesaParcelaCreate
from app.schemas.receita import ReceitaCreate, ReceitaUpdate, ReceitaResponse
from app.schemas.auth import LoginRequest, LoginResponse, RefreshRequest, MessageResponse
from app.schemas.usuario import UsuarioCreate, UsuarioMeResponse
from app.schemas.common import PaginatedResponse, FilterParams
from app.models.apartamento import TipoApartamento, StatusApartamento
from app.models.morador import TipoMorador
from app.models.despesa import TipoDespesa
from app.models.receita import TipoReceita, StatusFinanceiro
from app.models.usuario import RoleUsuario


# ── Apartamento ────────────────────────────────────────────────────

class TestApartamentoCreate:
    def test_valid_minimal(self):
        data = ApartamentoCreate(numero="101")
        assert data.numero == "101"
        assert data.tipo == TipoApartamento.padrao
        assert data.status == StatusApartamento.vazio
        assert data.bloco is None
        assert data.proprietario_id is None

    def test_valid_full(self):
        pid = uuid.uuid4()
        data = ApartamentoCreate(
            numero="202", bloco="A", tipo=TipoApartamento.cobertura,
            fracao_ideal=0.5, metragem=120.0, vaga_demarcada="Vaga 5",
            status=StatusApartamento.ocupado, proprietario_id=pid,
        )
        assert data.numero == "202"
        assert data.proprietario_id == pid

    def test_empty_proprietario_id_becomes_none(self):
        data = ApartamentoCreate(numero="101", proprietario_id="")
        assert data.proprietario_id is None

    def test_none_proprietario_id_stays_none(self):
        data = ApartamentoCreate(numero="101", proprietario_id=None)
        assert data.proprietario_id is None

    def test_empty_responsavel_id_becomes_none(self):
        data = ApartamentoCreate(numero="101", responsavel_id="")
        assert data.responsavel_id is None

    def test_with_responsavel_id(self):
        rid = uuid.uuid4()
        data = ApartamentoCreate(numero="101", responsavel_id=rid)
        assert data.responsavel_id == rid

    def test_missing_required_numero_raises(self):
        with pytest.raises(ValidationError):
            ApartamentoCreate()

    def test_invalid_tipo_raises(self):
        with pytest.raises(ValidationError):
            ApartamentoCreate(numero="101", tipo="invalido")


class TestApartamentoUpdate:
    def test_all_optional(self):
        data = ApartamentoUpdate()
        assert data.model_dump(exclude_unset=True) == {}

    def test_partial_update(self):
        data = ApartamentoUpdate(numero="202", status=StatusApartamento.ocupado)
        assert data.numero == "202"
        assert data.status == StatusApartamento.ocupado
        assert data.tipo is None

    def test_empty_proprietario_id(self):
        data = ApartamentoUpdate(proprietario_id="")
        assert data.proprietario_id is None


class TestApartamentoResponse:
    def test_from_attributes(self):
        now = datetime.now()
        pid = uuid.uuid4()
        data = {
            "id": uuid.uuid4(), "numero": "101", "bloco": "A",
            "tipo": TipoApartamento.padrao, "fracao_ideal": 0.5, "metragem": 100.0,
            "vaga_demarcada": None, "status": StatusApartamento.vazio,
            "proprietario_id": pid, "created_at": now, "updated_at": now,
        }
        resp = ApartamentoResponse.model_validate(data)
        assert resp.numero == "101"
        assert resp.proprietario_id == pid


class TestApartamentoListResponse:
    def test_from_attributes(self):
        data = {
            "id": uuid.uuid4(), "numero": "101", "bloco": "A",
            "tipo": TipoApartamento.padrao, "status": StatusApartamento.vazio,
            "proprietario_id": None,
        }
        resp = ApartamentoListResponse.model_validate(data)
        assert resp.numero == "101"


# ── Proprietario ───────────────────────────────────────────────────

class TestProprietarioCreate:
    def test_valid(self):
        data = ProprietarioCreate(nome="João", cpf="12345678901")
        assert data.nome == "João"
        assert data.telefone is None

    def test_missing_required_raises(self):
        with pytest.raises(ValidationError):
            ProprietarioCreate()


class TestProprietarioUpdate:
    def test_partial(self):
        data = ProprietarioUpdate(nome="João Atualizado")
        assert data.cpf is None


class TestProprietarioResponse:
    def test_from_attributes(self):
        now = datetime.now()
        data = {
            "id": uuid.uuid4(), "nome": "João", "cpf": "12345678901",
            "telefone": None, "email": "joao@email.com",
            "created_at": now, "updated_at": now,
        }
        resp = ProprietarioResponse.model_validate(data)
        assert resp.nome == "João"


# ── Morador ────────────────────────────────────────────────────────

class TestMoradorCreate:
    def test_valid(self):
        data = MoradorCreate(nome="Maria", cpf="98765432100")
        assert data.nome == "Maria"
        assert data.tipo == TipoMorador.morador

    def test_with_all_fields(self):
        data = MoradorCreate(
            nome="Maria", cpf="98765432100", telefone="11999999999",
            email="maria@email.com", veiculo="ABC-1234",
            tipo=TipoMorador.inquilino,
        )
        assert data.veiculo == "ABC-1234"

    def test_missing_required_raises(self):
        with pytest.raises(ValidationError):
            MoradorCreate()


class TestMoradorUpdate:
    def test_empty_is_valid(self):
        data = MoradorUpdate()
        assert data.model_dump(exclude_unset=True) == {}


class TestMoradorResponse:
    def test_extract_relationships_with_responsavel(self):
        class MockApto:
            def __init__(self, id, numero, bloco=None, responsavel_id=None):
                self.id = id
                self.numero = numero
                self.bloco = bloco
                self.responsavel_id = responsavel_id

        class MockMorador:
            def __init__(self, id, nome):
                self.id = id
                self.nome = nome
                self.cpf = "123"
                self.telefone = None
                self.email = None
                self.veiculo = None
                self.tipo = TipoMorador.proprietario
                self.apartamentos = []
                self.apartamentos_proprietario = []
                self.apartamentos_responsavel = []
                self.created_at = datetime.now()
                self.updated_at = datetime.now()

        m_id = uuid.uuid4()
        apto1 = MockApto(uuid.uuid4(), "101", "A", responsavel_id=m_id)
        morador_obj = MockMorador(m_id, "Carlos")
        morador_obj.apartamentos_proprietario = [apto1]
        morador_obj.apartamentos_responsavel = [apto1]

        resp = MoradorResponse.model_validate(morador_obj)
        assert len(resp.apartamentos) == 1
        assert resp.apartamentos[0].numero == "101"
        assert resp.apartamentos[0].is_responsavel is True
        assert resp.apartamentos[0].tipo_vinculo == "proprietario"


class TestVincularApartamento:
    def test_valid(self):
        aid = uuid.uuid4()
        data = VincularApartamento(apartamento_id=aid)
        assert data.apartamento_id == aid
        assert data.definir_como_responsavel is False

    def test_with_dates(self):
        data = VincularApartamento(
            apartamento_id=uuid.uuid4(),
            definir_como_responsavel=True,
            data_inicio=date(2024, 1, 1),
            data_fim=date(2024, 12, 31),
        )
        assert data.data_inicio == date(2024, 1, 1)
        assert data.definir_como_responsavel is True


# ── Despesa ────────────────────────────────────────────────────────

class TestDespesaCreate:
    def test_valid(self):
        data = DespesaCreate(
            descricao="Conta de Luz", valor=150.50,
            competencia=date(2024, 1, 1),
        )
        assert data.tipo == TipoDespesa.ordinaria
        assert data.parcelamento is False

    def test_com_parcelamento(self):
        data = DespesaCreate(
            descricao="Obra", valor=3000.00,
            competencia=date(2024, 1, 1),
            tipo=TipoDespesa.extraordinaria,
            parcelamento=True, total_parcelas=6,
        )
        assert data.parcelamento is True
        assert data.total_parcelas == 6

    def test_missing_required_raises(self):
        with pytest.raises(ValidationError):
            DespesaCreate()


class TestDespesaParcelaCreate:
    def test_valid(self):
        data = DespesaParcelaCreate(
            numero_parcela=1, valor=500.0,
            competencia=date(2024, 1, 1),
        )
        assert data.numero_parcela == 1


# ── Receita ────────────────────────────────────────────────────────

class TestReceitaCreate:
    def test_valid(self):
        data = ReceitaCreate(
            descricao="Aluguel", valor=2000.00,
            competencia=date(2024, 1, 1),
        )
        assert data.tipo == TipoReceita.condominio

    def test_with_apartamento(self):
        aid = uuid.uuid4()
        data = ReceitaCreate(
            descricao="Aluguel", valor=2000.00,
            competencia=date(2024, 1, 1),
            apartamento_id=aid,
        )
        assert data.apartamento_id == aid


# ── Auth ────────────────────────────────────────────────────────────

class TestAuthSchemas:
    def test_login_request(self):
        data = LoginRequest(email="user@test.com", password="123")
        assert data.email == "user@test.com"

    def test_login_response(self):
        data = LoginResponse(access_token="abc", refresh_token="def")
        assert data.token_type == "bearer"

    def test_refresh_request(self):
        data = RefreshRequest(refresh_token="abc")
        assert data.refresh_token == "abc"

    def test_message_response(self):
        data = MessageResponse(message="OK")
        assert data.message == "OK"


# ── Usuario ────────────────────────────────────────────────────────

class TestUsuarioCreate:
    def test_valid(self):
        data = UsuarioCreate(nome="Admin", email="admin@test.com", password="secret")
        assert data.role == RoleUsuario.morador


class TestUsuarioMeResponse:
    def test_from_attributes(self):
        data = {
            "id": uuid.uuid4(), "nome": "Admin", "email": "admin@test.com",
            "role": RoleUsuario.admin,
        }
        resp = UsuarioMeResponse.model_validate(data)
        assert resp.role == RoleUsuario.admin


# ── Common ─────────────────────────────────────────────────────────

class TestPaginatedResponse:
    def test_valid(self):
        data = PaginatedResponse[int](items=[1, 2], total=2, page=1, page_size=20, total_pages=1)
        assert len(data.items) == 2

    def test_zero_total_pages(self):
        data = PaginatedResponse[int](items=[], total=0, page=1, page_size=20, total_pages=0)
        assert data.total == 0
