# Condo Gestão

Sistema web de gestão de condomínio residencial.

## Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui + React Query
- **Backend:** FastAPI + Python 3.12 + SQLAlchemy 2.0 + Pydantic + JWT
- **Banco:** PostgreSQL 16
- **Infra:** Docker + Docker Compose

## Módulos

| Módulo | Descrição |
|--------|-----------|
| Dashboard | Cards e gráficos financeiros |
| Apartamentos | CRUD com 3 tipos (padrão, área privativa, cobertura) |
| Proprietários | CRUD com vínculo N:N aos apartamentos |
| Moradores | CRUD com tipo (morador, inquilino, dependente) |
| Receitas | Gestão de receitas (condomínio, fundo reserva, taxa extra) |
| Despesas | Gestão de despesas ordinárias e extraordinárias |
| Cobranças | Geração e pagamento de cobranças por apartamento |
| Contas Extraordinárias | Parcelamento automático de despesas |
| Água | Rateio proporcional por peso do apartamento |
| Gás | Controle de consumo por leitura individual |
| Avisos | Comunicados com opção de envio por email |
| Assembleias | Pautas e atas de reuniões |
| Documentos | Upload/download de documentos categorizados |
| Inadimplência | Multa, juros e tolerância configuráveis |
| Relatórios | Exportação em PDF e Excel |
| Auditoria | Log completo de alterações no sistema |

## Como rodar

```bash
# Subir tudo com Docker
docker-compose up --build
```

Serviços:
- **Frontend:** http://localhost:3080
- **Backend API:** http://localhost:8080
- **Swagger:** http://localhost:8080/docs
- **PostgreSQL (Host):** localhost:5435

Login inicial:
- Email: `admin@condo.com`
- Senha: `admin123`

## Regras de Negócio (Backend)

- **Rateio de Água:** `valor_apto = (peso_apto / soma_pesos) * valor_total`
  - Pesos: Padrão = 1.0, Área Privativa = 1.5, Cobertura = 2.0

- **Consumo de Gás:** `consumo = leitura_atual - leitura_anterior`

- **Inadimplência:**
  - `dias_atraso = (hoje - vencimento) - dias_tolerancia`
  - `multa = valor * (percentual_multa / 100)`
  - `juros = valor * (percentual_juros_mes / 100) * ceil(dias_atraso / 30)`

## Estrutura do Projeto

```
condo/
  backend/
    app/
      main.py                 # FastAPI app
      core/                   # config, database, security, permissions
      models/                 # SQLAlchemy models (22 tabelas)
      schemas/                # Pydantic schemas
      api/v1/endpoints/       # REST endpoints
      services/               # Lógica de negócio
      utils/                  # pagination, file_storage, pdf_export
    alembic/                  # Migrations
    seed.py                   # Script de dados iniciais
  frontend/
    app/                      # Next.js App Router
      (auth)/login/           # Página de login
      (dashboard)/            # Layout + todos os módulos
    components/               # shadcn/ui + layout
    hooks/                    # use-auth
    lib/                      # api client, providers
    services/                 # React Query hooks
    types/                    # TypeScript types
  docker-compose.yml
```
