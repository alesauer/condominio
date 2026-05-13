# Estrutura do Projeto

## Backend (`backend/`)

```
backend/
  .env                          # Configuração de ambiente
  .env.example                  # Template de configuração
  alembic.ini                   # Config Alembic
  alembic/
    env.py                      # Config de migração com async engine
    versions/                   # Migrations
  seed.py                       # Script de seed (admin + config)
  requirements.txt              # Dependências Python
  Dockerfile                    # Python 3.12-slim
  app/
    main.py                     # FastAPI app, CORS, global handler
    core/
      config.py                 # pydantic-settings
      database.py               # async engine + session
      security.py               # JWT + bcrypt
      permissions.py            # Role-based access
      exceptions.py             # CondoException
    models/
      base.py                   # Mixin: id UUID + timestamps
      usuario.py                # User + RoleUsuario enum
      apartamento.py            # TipoApartamento + StatusApartamento enums
      proprietario.py           # Proprietário
      morador.py                # TipoMorador enum
      apartamento_proprietario.py  # N:N association
      apartamento_morador.py       # N:N with date range
      receita.py                # TipoReceita + StatusFinanceiro enums
      despesa.py                # TipoDespesa enum
      despesa_parcela.py        # Parcela de despesa
      cobranca.py               # Cobrança por apartamento
      leitura_gas.py            # Leitura de gás
      agua_rateio.py            # Rateio de água
      agua_rateio_apartamento.py  # Detalhamento por apto
      aviso.py                  # PrioridadeAviso enum
      assembleia.py             # Assembleia
      pauta.py                  # Pauta de assembleia
      ata.py                    # Ata de assembleia
      documento.py              # CategoriaDocumento enum
      anexo.py                  # Anexo polimórfico
      config_inadimplencia.py   # Config de multa/juros
      auditoria.py              # Log de auditoria (JSONB)
      token_refresh.py          # Refresh tokens
    schemas/
      common.py                 # PaginatedResponse, FilterParams
      auth.py                   # Login, Refresh, Message
      usuario.py                # UsuarioCreate/Update/Response
      apartamento.py            # ApartamentoCreate/Update/Response
      proprietario.py           # ProprietarioCreate/Update/Response
      morador.py                # MoradorCreate/Update/Response
      receita.py                # ReceitaCreate/Update/Response
      despesa.py                # DespesaCreate/Update/Response + Parcela
      cobranca.py               # CobrancaResponse
      agua_rateio.py            # AguaRateioCreate/Response + Apartamento
      leitura_gas.py            # LeituraGasCreate/Response + Lote
    api/
      deps.py                   # get_current_user dependency
      v1/
        router.py               # Agrega todos os routers
        endpoints/
          auth.py               # POST login, refresh, logout, GET me
          usuarios.py           # CRUD usuários (admin)
          apartamentos.py       # CRUD + vincular proprietário/morador
          proprietarios.py      # CRUD proprietários
          moradores.py          # CRUD + vincular apartamento
          receitas.py           # CRUD receitas
          despesas.py           # CRUD despesas + parcelamento
          cobrancas.py          # List + pagar cobrança
          agua_rateios.py       # CRUD rateio + cálculo automático
          leituras_gas.py       # CRUD leitura + lote + cálculo consumo
          avisos.py             # CRUD avisos
          assembleias.py        # CRUD assembleias + pautas
          documentos.py         # Upload/download/delete
          dashboard.py          # Cards + receitas/despesas mensais
          inadimplencia.py      # Config + cobranças atrasadas + recalcular
          relatorios.py         # Balancete PDF/Excel
          auditoria.py          # List audit log
    services/
      auth_service.py           # authenticate, refresh, revoke
      usuario_service.py        # CRUD usuários
      apartamento_service.py    # CRUD + get_peso()
      proprietario_service.py   # CRUD
      morador_service.py        # CRUD + vínculo
      receita_service.py        # CRUD
      despesa_service.py        # CRUD + parcelamento automático
      cobranca_service.py       # List + pagar
      agua_rateio_service.py    # Rateio: peso * valor_total / soma_pesos
      leitura_gas_service.py    # consumo = leitura_atual - anterior
      email_service.py          # SMTP email
      auditoria_service.py      # Log centralizado
    utils/
      pagination.py             # paginate() helper
      file_storage.py           # save_upload(), get_file_path()
      pdf_export.py             # (reportlab)
      excel_export.py           # (openpyxl)
```

## Frontend (`frontend/`)

```
frontend/
  package.json                  # Dependências
  tailwind.config.ts            # Tailwind + shadcn CSS vars
  postcss.config.js             # PostCSS
  tsconfig.json                 # TypeScript config
  next.config.ts                # API proxy rewrite
  app/
    globals.css                 # Tailwind base + CSS variables
    layout.tsx                  # Root layout: Theme + Query + Auth + Toaster
    page.tsx                    # Redireciona p/ /overview ou /login
    (auth)/
      login/
        page.tsx                # Login form
    (dashboard)/
      layout.tsx                # Sidebar + Header
      page.tsx                  # Redireciona p/ /overview
      overview/
        page.tsx                # Dashboard cards
      apartamentos/
        page.tsx                # Lista com filtros
        novo/page.tsx           # Criar
        [id]/page.tsx           # Editar
      proprietarios/
        page.tsx                # Lista
        novo/page.tsx           # Criar
        [id]/page.tsx           # Editar
      moradores/
        page.tsx                # Lista com filtro tipo
        novo/page.tsx           # Criar
        [id]/page.tsx           # Editar
      financeiro/
        receitas/
          page.tsx              # Lista
          nova/page.tsx         # Criar
          [id]/page.tsx         # Editar
        despesas/
          page.tsx              # Lista
          nova/page.tsx         # Criar com parcelamento
          [id]/page.tsx         # Editar
        cobrancas/
          page.tsx              # Lista + botão pagar
        extraordinarias/
          page.tsx              # Lista
          nova/page.tsx         # Criar
          [id]/page.tsx         # Detalhe
      agua/
        page.tsx                # Lista rateios
        novo/page.tsx           # Criar rateio
        [id]/page.tsx           # Detalhamento por apto
      gas/
        page.tsx                # Lista leituras
        novo/page.tsx           # Nova leitura
        [id]/page.tsx           # Editar
      avisos/
        page.tsx                # Card list
        novo/page.tsx           # Criar
      assembleias/
        page.tsx                # Card list
        nova/page.tsx           # Criar
      documentos/
        page.tsx                # Upload + download
      inadimplencia/
        page.tsx                # Config + cobranças atrasadas
      relatorios/
        page.tsx                # Seleção + download
      auditoria/
        page.tsx                # Log viewer
  components/
    ui/
      button.tsx                # Botão com variants
      input.tsx                 # Input
      label.tsx                 # Label (Radix)
      card.tsx                  # Card, CardHeader, CardContent, etc.
      badge.tsx                 # Badge
      skeleton.tsx              # Loading skeleton
      separator.tsx             # Separator (Radix)
      select.tsx                # Select (Radix)
      switch.tsx                # Switch (Radix)
    layout/
      sidebar.tsx               # Sidebar colapsável
      header.tsx                # Header com dark mode + logout
  hooks/
    use-auth.ts                 # Auth context + login/logout
  lib/
    api.ts                      # Axios + JWT interceptors
    query-provider.tsx          # React Query provider
    theme-provider.tsx          # Next-themes provider
    utils.ts                    # cn(), formatCurrency(), formatDate()
  services/
    auth.service.ts             # useMe()
    apartamentos.service.ts     # CRUD hooks
    proprietarios.service.ts    # CRUD hooks
    moradores.service.ts        # CRUD hooks
    receitas.service.ts         # CRUD hooks
    despesas.service.ts         # CRUD hooks
    cobrancas.service.ts        # List + pagar hooks
  types/
    index.ts                    # PaginatedResponse, FilterParams
    auth.ts                     # User, LoginRequest
    apartamento.ts              # Apartamento interface
    proprietario.ts             # Proprietario interface
    morador.ts                  # Morador interface
    financeiro.ts               # Receita, Despesa, Cobranca interfaces
```

## Banco de Dados (22 tabelas)

```
usuarios, apartamentos, proprietarios, apartamento_proprietarios,
moradores, apartamento_moradores, receitas, despesas, despesa_parcelas,
cobrancas, leituras_gas, agua_rateios, agua_rateio_apartamentos,
avisos, assembleias, pautas, atas, documentos, anexos,
config_inadimplencia, auditoria, tokens_refresh
```

Todos IDs são UUID. Valores monetários `NUMERIC(12,2)`. Auditoria usa JSONB.
