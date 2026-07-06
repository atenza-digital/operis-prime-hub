# Atenza FieldOps

Do contrato ao campo. Do campo ao certificado.

Gestão de serviços técnicos, equipes de campo, OS, evidências, certificados e medições.

## Contexto

Esta base é o ambiente de homologação do Atenza FieldOps para o tenant Ciperprag. O sistema usa dados persistidos no PostgreSQL e não deve depender de mocks ou dados locais em operação.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query
- React Router DOM
- Backend: Node.js + PostgreSQL
- Schema atual de homologação: `ciperprag_hub`

## Desenvolvimento

```bash
npm install
npm run dev
```

## Validação

```bash
npm test -- --run
npm run lint
npm run build
```

## Produção / VPS de Homologação

O container serve:

- frontend compilado em `dist`
- API em `/api`

Variáveis mínimas esperadas:

```bash
PORT=80
PGHOST=89.116.214.65
PGPORT=5432
PGDATABASE=atenza
PGUSER=root
PGPASSWORD=...
```

Build Docker:

```bash
docker build -t atenza-fieldops .
docker run -d --name atenza-fieldops -p 3010:80 --env-file .env.production atenza-fieldops
```

## Documentação

- Roadmap por etapas: `docs/backlog/ROADMAP_ETAPAS.md`
- Guia de homologação: `docs/cliente/GUIA_HOMOLOGACAO_OPERACIONAL.md`
- Versionamento: `docs/versoes/VERSIONAMENTO.md`
- Releases: `docs/releases`
- Evidências: `docs/evidencias`
- Documentos validados: `docs/validados`

## Marca

Atenza FieldOps é o nome da plataforma. Ciperprag permanece como cliente/tenant e marca documental nos documentos emitidos para esse cliente.
