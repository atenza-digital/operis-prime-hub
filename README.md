# Ciperprag Hub

Sistema de gestão operacional e comercial para a Ciperprag Controle de Pragas e Serviços LTDA.

## Stack
- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- TanStack Query
- React Router DOM
- Backend: Node.js + PostgreSQL (schema: `ciperprag_hub`)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Produção / VPS

O projeto deve subir como aplicação Node completa, servindo:
- frontend compilado em `dist`
- API em `/api`

Variáveis mínimas esperadas no container:

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
docker build -t ciperprag-hub .
docker run -d --name ciperprag-hub -p 3010:80 \
  -e PORT=80 \
  -e PGHOST=89.116.214.65 \
  -e PGPORT=5432 \
  -e PGDATABASE=atenza \
  -e PGUSER=root \
  -e PGPASSWORD=*** \
  ciperprag-hub
```
