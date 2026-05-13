
# ESPECIFICAÇÃO COMPLETA — SISTEMA DE GESTÃO DE CONDOMÍNIO

## Objetivo do Sistema

Desenvolver um sistema web de gestão de condomínio residencial único.

O sistema deverá possuir:
- dashboard administrativo
- gestão financeira
- controle de apartamentos
- controle de moradores
- controle de proprietários
- rateio de água
- controle de gás
- avisos
- assembleias
- relatórios
- auditoria
- inadimplência


---

# Stack Tecnológica

## Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query
- React Hook Form
- Zod

## Backend
- Python 3.12+
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- JWT Authentication

## Banco de Dados
- Supabase PostgreSQL
- Supabase Storage

## Infraestrutura
- Docker
- Apache
- VPS Linux

---

# Arquitetura do Sistema

## Regra principal

Toda regra de negócio deve ficar no backend.

O frontend deve:
- consumir APIs
- renderizar telas
- validar formulários básicos
- exibir dashboards

O backend deve:
- calcular rateios
- calcular juros
- calcular multas
- gerar cobranças
- controlar auditoria
- aplicar regras financeiras

---

# Requisitos Gerais

## O sistema deve possuir:

- autenticação
- controle de permissões
- dashboard
- CRUD completo
- filtros
- paginação
- exportação PDF
- exportação Excel
- upload de arquivos
- logs
- dark mode
- layout responsivo

---

# Design do Frontend

## Aparência desejada

Inspirado em:
- Pulse UI — Painel de administração do React + Next.js e outros similares

## Layout

- sidebar fixa
- sidebar colapsável
- header superior
- tabelas modernas
- gráficos
- cards financeiros
- loading skeleton
- modal dialogs
- toast notifications

---

# Perfis do Sistema

## Administrador / Síndico

Permissões:
- acesso total
- cadastrar apartamentos
- cadastrar moradores
- cadastrar despesas
- cadastrar receitas
- gerar cobranças
- enviar avisos
- gerar relatórios
- visualizar dashboard

---

## Morador

Permissões:
- visualizar cobranças
- visualizar consumo
- visualizar avisos
- baixar documentos
- visualizar histórico

---

## Proprietário

Permissões:
- visualizar situação financeira
- visualizar documentos
- visualizar cobranças
- receber avisos

Observação:
- proprietário pode não morar no apartamento

---

# Módulo — Dashboard

## Objetivo

Centralizar indicadores financeiros e operacionais.

## Cards obrigatórios

- saldo atual
- receitas do mês
- despesas do mês
- inadimplência total
- contas extraordinárias
- consumo de água
- consumo de gás

## Gráficos obrigatórios

- despesas mensais
- receitas mensais
- inadimplência mensal
- evolução financeira
- consumo água
- consumo gás

## Requisitos UI

- filtros por período
- atualização dinâmica
- gráficos responsivos

---

# Módulo — Apartamentos

## Campos

- id
- número
- bloco
- tipo
- fração ideal
- metragem
- vaga demarcada
- status

## Tipos permitidos

- padrão
- cobertura
- área privativa

## Status permitidos

- ocupado
- vazio
- alugado

## Regras

- cobertura possui peso 2 no rateio da água
- área privativa possui peso 1.5
- padrão possui peso 1

## Funcionalidades

- criar apartamento
- editar apartamento
- excluir apartamento
- listar apartamentos
- pesquisar apartamentos
- filtrar apartamentos

---

# Módulo — Proprietários

## Regras

- proprietário pode possuir múltiplos apartamentos
- proprietário pode não morar no imóvel

## Campos

- id
- nome
- cpf
- telefone
- email

---

# Módulo — Moradores

## Regras

- apartamento pode possuir múltiplos moradores
- morador pode ser inquilino
- morador pode ser dependente

## Campos

- id
- nome
- cpf
- telefone
- email
- veículo
- tipo

## Tipos permitidos

- morador
- inquilino
- dependente

---

# Módulo — Financeiro

## Receitas

Tipos:
- condomínio
- fundo de reserva
- taxas extras

## Despesas

Tipos:
- ordinária
- extraordinária

## Funcionalidades

- lançar receita
- lançar despesa
- editar lançamento
- excluir lançamento
- anexar comprovantes
- histórico financeiro

## Campos

- descrição
- categoria
- competência
- vencimento
- valor
- status
- observação

---

# Módulo — Contas Extraordinárias

## Funcionalidades

- cadastro de despesas extraordinárias
- parcelamento
- geração automática mensal
- anexos
- rateio proporcional

## Regras

- parcelas devem ser geradas automaticamente
- cobrança deve aparecer no financeiro mensal

---

# Módulo — Água

## Regra principal

O valor total da conta deve ser rateado proporcionalmente utilizando peso do apartamento.

## Pesos

- padrão = 1
- área privativa = 1.5
- cobertura = 2

## Fórmula

valor_apto = (peso_apto / soma_pesos) * valor_total

## Funcionalidades

- lançar conta mensal
- calcular rateio
- histórico mensal
- ajustes manuais

## Campos

- competência
- valor total
- observação

---

# Módulo — Gás

## Regra principal

Cobrança individual por consumo.

## Funcionalidades

- registrar leitura
- calcular consumo
- calcular cobrança
- gerar histórico

## Campos

- leitura anterior
- leitura atual
- consumo
- valor cobrado

## Fórmula

consumo = leitura_atual - leitura_anterior

---

# Módulo — Avisos

## Funcionalidades

- criar aviso
- editar aviso
- excluir aviso
- envio por email
- anexos
- avisos prioritários

## Campos

- título
- descrição
- prioridade
- data publicação
- anexos

---

# Módulo — Assembleias

## Funcionalidades

- cadastro de assembleias
- cadastro de pautas
- upload de atas
- histórico

## Campos

- data
- pauta
- descrição
- anexos

---

# Módulo — Relatórios

## Relatórios obrigatórios

- balancete mensal
- despesas anuais
- inadimplência
- água
- gás
- extrato apartamento

## Exportações

- PDF
- Excel

---

# Módulo — Inadimplência

## Funcionalidades

- controle de atraso
- cálculo automático de multa
- cálculo automático de juros
- histórico de cobrança

## Configurações

- percentual de multa
- percentual de juros
- dias tolerância

---

# Módulo — Documentos

## Funcionalidades

- upload de arquivos
- download
- organização por categoria

## Tipos

- atas
- boletos
- comprovantes
- contratos
- convenção

---

# Auditoria

## O sistema deve registrar

- usuário responsável
- data/hora
- alteração realizada
- exclusão
- edição financeira

---

# Segurança

## Requisitos

- autenticação JWT
- controle de permissões
- senhas criptografadas
- proteção de rotas
- validação backend

---

# Estrutura das APIs

## Endpoints principais

/api/auth
/api/apartamentos
/api/moradores
/api/proprietarios
/api/financeiro
/api/rateio-agua
/api/gas
/api/avisos
/api/assembleias
/api/relatorios
/api/documentos

---

# Estrutura de Pastas — Frontend

/app
/components
/modules
/services
/hooks
/types
/lib
/styles

---

# Estrutura de Pastas — Backend

/app
/app/api
/app/models
/app/schemas
/app/services
/app/repositories
/app/core
/app/utils
/app/middlewares

---

# Modelagem Inicial do Banco

## Tabelas

apartamentos
proprietarios
moradores
apartamento_proprietarios
apartamento_moradores
despesas
receitas
cobrancas
leituras_gas
agua_rateios
avisos
assembleias
documentos
logs

---

# Regras IMPORTANTES

## Backend deve controlar:

- cálculos financeiros
- rateios
- multas
- juros
- geração automática mensal
- auditoria

## Frontend NÃO deve possuir regra financeira.

---

# Requisitos de Qualidade

## O código gerado deve:

- ser componentizado
- possuir tipagem forte
- utilizar TypeScript
- utilizar validações com Zod
- utilizar boas práticas
- evitar código duplicado
- possuir organização modular

---

# Requisitos de UI

## Todas as tabelas devem possuir:

- paginação
- busca
- filtros
- ordenação
- loading
- estado vazio

---

# Objetivo Final

O sistema deve possuir aparência profissional semelhante a um ERP moderno, com foco em:
- clareza visual
- produtividade
- facilidade operacional
- controle financeiro
- baixa complexidade operacional
