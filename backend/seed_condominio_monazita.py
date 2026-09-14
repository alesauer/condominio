"""
Script de carga de dados reais do Condomínio Edifício Monazita
Importa:
- Apartamentos (101, 201, 202, 301, 302, 401, 402)
- Proprietários
- Moradores (vinculados aos apartamentos)
- Avisos com Contatos de Fornecedores, Manutenção e Informações de Contas/Acessos Úteis
"""
import asyncio
from datetime import date
from sqlalchemy import select
from app.core.database import async_session, engine, Base
from app.models.apartamento import Apartamento, TipoApartamento, StatusApartamento
from app.models.proprietario import Proprietario
from app.models.morador import Morador, TipoMorador
from app.models.apartamento_morador import ApartamentoMorador
from app.models.aviso import Aviso, PrioridadeAviso
from app.models.usuario import Usuario
from app.models.config_inadimplencia import ConfigInadimplencia
from app.core.security import hash_password
import app.models  # noqa: F401


DADOS_APARTAMENTOS = [
    {
        "numero": "101",
        "tipo": TipoApartamento.area_privativa,
        "fracao_ideal": 0.171432,
        "metragem": 95.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "ALEXANDRE SAUER PAIS LEMES",
            "cpf": "030.402.226-86",
            "email": "alesauer@gmail.com",
            "telefone": "(31) 99504-1815"
        },
        "moradores": [
            {
                "nome": "ALEXANDRE SAUER PAIS LEMES",
                "cpf": "030.402.226-86",
                "email": "alesauer@gmail.com",
                "telefone": "(31) 99504-1815",
                "tipo": TipoMorador.morador
            },
            {
                "nome": "Cristiane Maria de Araújo Pais Lemes",
                "cpf": "038.540.796-30",
                "email": "cristianepaesleme@gmail.com",
                "telefone": "(31) 98419-7636",
                "tipo": TipoMorador.morador
            }
        ]
    },
    {
        "numero": "201",
        "tipo": TipoApartamento.padrao,
        "fracao_ideal": 0.121426,
        "metragem": 75.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "Geranyce de Miranda Guedes",
            "cpf": "566.541.546-49",
            "email": "geranyce@gmail.com",
            "telefone": "(31) 99315-8159"
        },
        "moradores": [
            {
                "nome": "Geranyce de Miranda Guedes",
                "cpf": "566.541.546-49",
                "email": "geranyce@gmail.com",
                "telefone": "(31) 99315-8159",
                "tipo": TipoMorador.morador
            },
            {
                "nome": "Samuel Tomáz Silva Vieira",
                "cpf": "102.012.576-45",
                "email": "stsv.samuel@gmail.com",
                "telefone": "(31) 99505-3544",
                "tipo": TipoMorador.morador
            }
        ]
    },
    {
        "numero": "202",
        "tipo": TipoApartamento.padrao,
        "fracao_ideal": 0.121426,
        "metragem": 75.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "Artur Pereira Pinheiro",
            "cpf": "480.501.996-49",
            "email": "ppinheiroartur@gmail.com",
            "telefone": "(98) 98140-9819"
        },
        "moradores": [
            {
                "nome": "Artur Pereira Pinheiro",
                "cpf": "480.501.996-49",
                "email": "ppinheiroartur@gmail.com",
                "telefone": "(98) 98140-9819",
                "tipo": TipoMorador.morador
            },
            {
                "nome": "CARLOS ALBERTO ALVARENGA",
                "cpf": "038.899.346-41",
                "email": "caalvarenga@gmail.com",
                "telefone": "(31) 98766-4588",
                "tipo": TipoMorador.morador
            }
        ]
    },
    {
        "numero": "301",
        "tipo": TipoApartamento.padrao,
        "fracao_ideal": 0.121426,
        "metragem": 75.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "Hener Adriano Moreira Rodrigues",
            "cpf": "003.637.756-25",
            "email": "heneradriano@gmail.com",
            "telefone": "(31) 97216-5534"
        },
        "moradores": [
            {
                "nome": "Hener Adriano Moreira Rodrigues",
                "cpf": "003.637.756-25",
                "email": "heneradriano@gmail.com",
                "telefone": "(31) 97216-5534",
                "tipo": TipoMorador.morador
            },
            {
                "nome": "Ana Maria Morais da Silva",
                "cpf": "163.957.866-87",
                "email": "ana.mmsilva12@gmail.com",
                "telefone": "(31) 9981-1200",
                "tipo": TipoMorador.morador
            }
        ]
    },
    {
        "numero": "302",
        "tipo": TipoApartamento.padrao,
        "fracao_ideal": 0.121426,
        "metragem": 75.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "Marisa Borato Viana",
            "cpf": "138.025.006-44",
            "email": "marisaborato@hotmail.com",
            "telefone": "(31) 99772-4205"
        },
        "moradores": [
            {
                "nome": "Marisa Borato Viana",
                "cpf": "138.025.006-44",
                "email": "marisaborato@hotmail.com",
                "telefone": "(31) 99772-4205",
                "tipo": TipoMorador.morador
            }
        ]
    },
    {
        "numero": "401",
        "tipo": TipoApartamento.cobertura,
        "fracao_ideal": 0.171432,
        "metragem": 130.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "Giubraz Mendes",
            "cpf": "207.451.252-04",
            "email": "giubraz@yahoo.com.br",
            "telefone": "(31) 9687-2611"
        },
        "moradores": [
            {
                "nome": "Giubraz Mendes",
                "cpf": "207.451.252-04",
                "email": "giubraz@yahoo.com.br",
                "telefone": "(31) 9687-2611",
                "tipo": TipoMorador.morador
            },
            {
                "nome": "Gleuba Espírito Santo Carvalho",
                "cpf": "015.921.895-04",
                "email": "gleubacaras@hotmail.com",
                "telefone": "(77) 9197-2383",
                "tipo": TipoMorador.morador
            }
        ]
    },
    {
        "numero": "402",
        "tipo": TipoApartamento.cobertura,
        "fracao_ideal": 0.171432,
        "metragem": 130.0,
        "status": StatusApartamento.ocupado,
        "proprietario": {
            "nome": "Ragner Douglas Dos Reis",
            "cpf": "065.953.656-00",
            "email": "ragnerdouglas@msn.com",
            "telefone": "(31) 98728-3997"
        },
        "moradores": [
            {
                "nome": "Ragner Douglas Dos Reis",
                "cpf": "065.953.656-00",
                "email": "ragnerdouglas@msn.com",
                "telefone": "(31) 98728-3997",
                "tipo": TipoMorador.morador
            },
            {
                "nome": "Sheilla Germano Cota Arrais",
                "cpf": "000.462.816-06",
                "email": "sheillaarrais@yahoo.com.br",
                "telefone": "(31) 9285-4000",
                "tipo": TipoMorador.morador
            }
        ]
    }
]

AVISOS_INICIAIS = [
    {
        "titulo": "📞 Guia de Fornecedores e Serviços do Condomínio",
        "descricao": """Lista de prestadores de serviço e fornecedores cadastrados:

• Gás: Lilico Gás - Tel: (31) 3411-2555 (Boleto para 15 dias)
• Conservadora: Ideal (Flávia) - Tel: (31) 98288-7753 (Vencimento dia 10)
• Portão Eletrônico: Clenilton / Cleber - Tel: (31) 99236-0153
• Seguro Predial: Allianz Seguradora - Tel Assistência 24h: 0800-017-7178
• Serviços Hidráulicos: (31) 99607-9909
• Serviços Elétricos: Teninho - Tel: (31) 99211-4764
• Zeladoria: Eduardo - Tel: (31) 98716-9566
• Limpeza e Locação de Equipamentos: MultiClean - Tel: (31) 9546-9391
• Cemig: 4090-1110 (Instalação nº 3004229728 - Vence todo dia 15)
• Copasa: Matrícula 00022802428 (CNPJ 01.188.118/0001-58)
• Claro: minhaclaroresidencial.claro.com.br/fatura-facil (Opção 6405)""",
        "prioridade": PrioridadeAviso.alta
    },
    {
        "titulo": "🏦 Dados Bancários e Administrativos do Condomínio",
        "descricao": """Condomínio Edifício Monazita
• CNPJ: 17.669.787/0001-81
• CEP: 30.720-530
• E-mail oficial: condominomonazita@gmail.com

Contas Bancárias:
• Banco Inter (077): Agência 0001 | Conta 335950868 | Chave PIX (CNPJ): 17.669.787/0001-81 (Operador: 42472033)
• Caixa Econômica: Operação 1951 - 195100
• App Câmeras Hik-Connect: 5531998176405 (Acesso: monazita670*)""",
        "prioridade": PrioridadeAviso.media
    }
]


async def seed_monazita():
    print("Iniciando importação dos dados reais do Condomínio Monazita...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # 1. Admin & Config
        existing_admin = await db.scalar(select(Usuario).where(Usuario.email == "admin@condo.com"))
        if not existing_admin:
            admin = Usuario(
                nome="Administrador",
                email="admin@condo.com",
                senha_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)

        existing_config = await db.scalar(select(ConfigInadimplencia))
        if not existing_config:
            config = ConfigInadimplencia(
                percentual_multa=2.00,
                percentual_juros_mes=1.00,
                dias_tolerancia=5,
            )
            db.add(config)

        # 2. Apartamentos, Proprietários e Moradores
        for apto_data in DADOS_APARTAMENTOS:
            # Buscar ou criar Proprietário como Morador
            p_data = apto_data["proprietario"]
            prop = await db.scalar(select(Morador).where(Morador.cpf == p_data["cpf"]))
            if not prop:
                prop = Morador(
                    nome=p_data["nome"],
                    cpf=p_data["cpf"],
                    email=p_data["email"],
                    telefone=p_data["telefone"],
                    tipo=TipoMorador.proprietario,
                )
                db.add(prop)
                await db.flush()
            else:
                prop.nome = p_data["nome"]
                prop.email = p_data["email"]
                prop.telefone = p_data["telefone"]
                if not prop.tipo:
                    prop.tipo = TipoMorador.proprietario

            # Buscar ou criar Apartamento
            apto = await db.scalar(select(Apartamento).where(Apartamento.numero == apto_data["numero"]))
            if not apto:
                apto = Apartamento(
                    numero=apto_data["numero"],
                    tipo=apto_data["tipo"],
                    fracao_ideal=apto_data["fracao_ideal"],
                    metragem=apto_data["metragem"],
                    status=apto_data["status"],
                    proprietario_id=prop.id,
                    responsavel_id=prop.id
                )
                db.add(apto)
                await db.flush()
            else:
                apto.tipo = apto_data["tipo"]
                apto.fracao_ideal = apto_data["fracao_ideal"]
                apto.metragem = apto_data["metragem"]
                apto.status = apto_data["status"]
                apto.proprietario_id = prop.id
                if not apto.responsavel_id:
                    apto.responsavel_id = prop.id

            # Moradores
            for m_data in apto_data["moradores"]:
                morador = await db.scalar(select(Morador).where(Morador.cpf == m_data["cpf"]))
                if not morador:
                    morador = Morador(
                        nome=m_data["nome"],
                        cpf=m_data["cpf"],
                        email=m_data["email"],
                        telefone=m_data["telefone"],
                        tipo=m_data["tipo"]
                    )
                    db.add(morador)
                    await db.flush()
                else:
                    morador.nome = m_data["nome"]
                    morador.email = m_data["email"]
                    morador.telefone = m_data["telefone"]

                # Vincular ao apartamento se ainda não estiver
                vinculo = await db.scalar(
                    select(ApartamentoMorador).where(
                        ApartamentoMorador.apartamento_id == apto.id,
                        ApartamentoMorador.morador_id == morador.id
                    )
                )
                if not vinculo:
                    vinculo = ApartamentoMorador(
                        apartamento_id=apto.id,
                        morador_id=morador.id,
                        data_inicio=date(2024, 1, 1)
                    )
                    db.add(vinculo)

        # 3. Avisos Informativos
        for av_data in AVISOS_INICIAIS:
            existing_aviso = await db.scalar(select(Aviso).where(Aviso.titulo == av_data["titulo"]))
            if not existing_aviso:
                aviso = Aviso(
                    titulo=av_data["titulo"],
                    descricao=av_data["descricao"],
                    prioridade=av_data["prioridade"],
                    data_publicacao=date.today(),
                    enviar_email=False
                )
                db.add(aviso)

        # 4. Receitas e Despesas de Teste para múltiplos meses
        from app.models.receita import Receita, TipoReceita, StatusFinanceiro
        from app.models.despesa import Despesa, TipoDespesa

        # Buscar todos os apartamentos cadastrados
        aptos_result = await db.execute(select(Apartamento))
        aptos_list = aptos_result.scalars().all()
        aptos_map = {a.numero: a.id for a in aptos_list}

        meses_teste = [
            (2026, 6, "pago"),
            (2026, 7, "pago"),
            (2026, 8, "pago"),
            (2026, 9, "misto"),
            (2026, 10, "pendente"),
        ]

        # Template de Despesas Recorrentes e Variadas
        despesas_template = [
            {"descricao": "Conservadora Ideal - Limpeza e Portaria", "tipo": TipoDespesa.ordinaria, "categoria": "Conservadora", "valor": 3200.00, "dia_venc": 10},
            {"descricao": "COPASA - Água do Condomínio", "tipo": TipoDespesa.ordinaria, "categoria": "Concessionária", "valor": 1180.40, "dia_venc": 15},
            {"descricao": "CEMIG - Energia Áreas Comuns", "tipo": TipoDespesa.ordinaria, "categoria": "Concessionária", "valor": 465.80, "dia_venc": 15},
            {"descricao": "Lilico Gás - Abastecimento Central", "tipo": TipoDespesa.ordinaria, "categoria": "Gás", "valor": 620.00, "dia_venc": 15},
            {"descricao": "Manutenção Portão Eletrônico (Clenilton)", "tipo": TipoDespesa.ordinaria, "categoria": "Manutenção", "valor": 250.00, "dia_venc": 5},
            {"descricao": "Seguro Predial Allianz (Parcela Mensal)", "tipo": TipoDespesa.ordinaria, "categoria": "Seguro", "valor": 410.00, "dia_venc": 20},
            {"descricao": "MultiClean - Locação Equipamentos Garagem", "tipo": TipoDespesa.ordinaria, "categoria": "Limpeza", "valor": 380.00, "dia_venc": 25},
        ]

        # Valores base de taxa de condomínio por tipo de unidade
        valores_condo = {
            "101": 650.00, # Área Privativa
            "201": 550.00, # Padrão
            "202": 550.00, # Padrão
            "301": 550.00, # Padrão
            "302": 550.00, # Padrão
            "401": 750.00, # Cobertura
            "402": 750.00, # Cobertura
        }

        despesas_setembro_2026 = [
            {"descricao": "Cemig", "tipo": TipoDespesa.ordinaria, "categoria": "Energia", "valor": 180.72, "dia_venc": 5, "obs": "05/09/2026 - Déb. Automático"},
            {"descricao": "Copasa", "tipo": TipoDespesa.ordinaria, "categoria": "Água", "valor": 1116.65, "dia_venc": 20, "obs": "20/09/2026 - Déb. Automático"},
            {"descricao": "Zeladora Natália", "tipo": TipoDespesa.ordinaria, "categoria": "Serviços", "valor": 700.00, "dia_venc": 5, "obs": "05/09/2026 - PIX"},
            {"descricao": "Adm Condomínio (Síndico)", "tipo": TipoDespesa.ordinaria, "categoria": "Administração", "valor": 300.00, "dia_venc": 5, "obs": "05/09/2026 - PIX"},
            {"descricao": "Claro", "tipo": TipoDespesa.ordinaria, "categoria": "Internet", "valor": 136.00, "dia_venc": 15, "obs": "15/09/2026 - Boleto"},
            {"descricao": "Compra itens jardim (05/05)", "tipo": TipoDespesa.ordinaria, "categoria": "Manutenção", "valor": 141.18, "dia_venc": 5, "obs": "Cartão Crédito Síndico"},
            {"descricao": "Placas Marcação Vagas", "tipo": TipoDespesa.ordinaria, "categoria": "Manutenção", "valor": 85.50, "dia_venc": 5, "obs": "Mercado Livre - PIX"},
        ]

        print("Gerando lançamentos de despesas de teste...")
        for ano, mes, situacao in meses_teste:
            dt_comp = date(ano, mes, 1)
            itens_mes = despesas_setembro_2026 if (ano == 2026 and mes == 9) else despesas_template
            for item in itens_mes:
                dt_venc = date(ano, mes, item["dia_venc"])
                obs = item.get("obs", "Lançamento mensal automático de teste")
                if situacao == "pago":
                    st = StatusFinanceiro.pago
                    dt_pag = dt_venc
                elif situacao == "pendente":
                    st = StatusFinanceiro.pendente
                    dt_pag = None
                else:
                    # Misto (mês 9)
                    st = StatusFinanceiro.pago if item["dia_venc"] <= 10 else StatusFinanceiro.pendente
                    dt_pag = dt_venc if st == StatusFinanceiro.pago else None

                existing = await db.scalar(
                    select(Despesa).where(
                        Despesa.descricao == item["descricao"],
                        Despesa.competencia == dt_comp
                    )
                )
                if not existing:
                    desp = Despesa(
                        descricao=item["descricao"],
                        tipo=item["tipo"],
                        categoria=item["categoria"],
                        valor=item["valor"],
                        competencia=dt_comp,
                        vencimento=dt_venc,
                        data_pagamento=dt_pag,
                        status=st,
                        observacao=obs,
                        parcelamento=False,
                    )
                    db.add(desp)

        # Despesa Extraordinária (Obra Reforma Fachada - apenas meses 6, 7, 8)
        for i, (ano, mes, _) in enumerate(meses_teste[:3], start=1):
            desc_extra = f"Reforma e Pintura Fachada ({i}/4)"
            dt_comp = date(ano, mes, 1)
            existing = await db.scalar(
                select(Despesa).where(
                    Despesa.descricao == desc_extra,
                    Despesa.competencia == dt_comp
                )
            )
            if not existing:
                desp_extra = Despesa(
                    descricao=desc_extra,
                    tipo=TipoDespesa.extraordinaria,
                    categoria="Obras",
                    valor=1500.00,
                    competencia=dt_comp,
                    vencimento=date(ano, mes, 20),
                    data_pagamento=date(ano, mes, 20),
                    status=StatusFinanceiro.pago,
                    observacao="Parcela obra fachada",
                    parcelamento=True,
                    total_parcelas=4,
                )
                db.add(desp_extra)

        print("Gerando lançamentos de receitas de teste...")
        for ano, mes, situacao in meses_teste:
            dt_comp = date(ano, mes, 1)
            dt_venc = date(ano, mes, 10)

            for num_apto, val_taxa in valores_condo.items():
                apto_id = aptos_map.get(num_apto)

                if situacao == "pago":
                    st = StatusFinanceiro.pago
                    dt_rec = dt_venc
                elif situacao == "pendente":
                    st = StatusFinanceiro.pendente
                    dt_rec = None
                else:
                    # Misto em setembro
                    if num_apto in ["101", "201", "202", "301"]:
                        st = StatusFinanceiro.pago
                        dt_rec = dt_venc
                    elif num_apto == "302":
                        st = StatusFinanceiro.atrasado
                        dt_rec = None
                    else:
                        st = StatusFinanceiro.pendente
                        dt_rec = None

                # Taxa de Condomínio
                desc_condo = f"Taxa Condomínio - Apto {num_apto}"
                existing_condo = await db.scalar(
                    select(Receita).where(
                        Receita.descricao == desc_condo,
                        Receita.competencia == dt_comp
                    )
                )
                if not existing_condo:
                    rec_condo = Receita(
                        descricao=desc_condo,
                        tipo=TipoReceita.condominio,
                        categoria="Mensalidade",
                        valor=val_taxa,
                        competencia=dt_comp,
                        vencimento=dt_venc,
                        data_recebimento=dt_rec,
                        status=st,
                        apartamento_id=apto_id,
                        observacao=f"Mensalidade ref {mes:02d}/{ano}",
                    )
                    db.add(rec_condo)

                # Fundo de Reserva
                desc_fundo = f"Fundo de Reserva - Apto {num_apto}"
                existing_fundo = await db.scalar(
                    select(Receita).where(
                        Receita.descricao == desc_fundo,
                        Receita.competencia == dt_comp
                    )
                )
                if not existing_fundo:
                    rec_fundo = Receita(
                        descricao=desc_fundo,
                        tipo=TipoReceita.fundo_reserva,
                        categoria="Fundo Reserva",
                        valor=50.00,
                        competencia=dt_comp,
                        vencimento=dt_venc,
                        data_recebimento=dt_rec,
                        status=st,
                        apartamento_id=apto_id,
                    )
                    db.add(rec_fundo)

                # Taxa Extra Obra
                desc_extra = f"Taxa Extra Obra Fachada - Apto {num_apto}"
                existing_extra = await db.scalar(
                    select(Receita).where(
                        Receita.descricao == desc_extra,
                        Receita.competencia == dt_comp
                    )
                )
                if not existing_extra:
                    rec_extra = Receita(
                        descricao=desc_extra,
                        tipo=TipoReceita.taxa_extra,
                        categoria="Obras",
                        valor=150.00,
                        competencia=dt_comp,
                        vencimento=dt_venc,
                        data_recebimento=dt_rec,
                        status=st,
                        apartamento_id=apto_id,
                    )
                    db.add(rec_extra)

        await db.commit()
        print("✅ Todos os dados reais e financeiros de teste foram importados com sucesso!")


if __name__ == "__main__":
    asyncio.run(seed_monazita())

