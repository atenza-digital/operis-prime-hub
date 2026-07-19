# Auditoria de Dependências - Etapa 8

Data: 19/07/2026  
Ambiente: desenvolvimento local / branch `homologacao/p0-relatorios-tecnicos`  
Objetivo: reduzir riscos técnicos sem alterar o fluxo funcional que está em homologação assistida.

## Resumo executivo

Foi executada uma rodada controlada de auditoria e correção de dependências com `npm audit fix`, sem uso de `--force` e sem atualização major automática.

Resultado principal:

- Auditoria inicial: 23 vulnerabilidades informadas pelo `npm audit`.
- Correção aplicada: atualização segura do `package-lock.json`, com 1 pacote adicionado e 38 pacotes alterados.
- Auditoria de produção após correção: 0 vulnerabilidades com `npm audit --omit=dev`.
- Auditoria completa após correção: 2 vulnerabilidades restantes em ferramentas de desenvolvimento/build (`vite` e `esbuild`), cuja correção automática exige upgrade major para Vite 8.

## Antes da correção

Comando:

```powershell
npm audit --json
```

Resumo informado pelo npm:

- Baixa: 1
- Moderada: 7
- Alta: 12
- Crítica: 3
- Total: 23

Principais famílias afetadas:

- `react-router-dom`, `react-router` e `@remix-run/router`
- `vite` e `esbuild`
- `vitest`
- `concurrently`
- `postcss`
- `ws`
- `rollup`

## Correção aplicada

Comando:

```powershell
npm audit fix
```

Resultado:

- 1 pacote adicionado.
- 38 pacotes alterados.
- Nenhum `npm audit fix --force` executado.
- `package.json` não foi alterado.
- `package-lock.json` foi atualizado.

Versões relevantes após a correção:

```text
vite: 5.4.21
vitest: 3.2.7
react-router: 6.30.4
react-router-dom: 6.30.4
@remix-run/router: 1.23.3
concurrently: 9.2.4
postcss: 8.5.20
esbuild: 0.21.5
```

## Resultado pós-correção

Auditoria de produção:

```powershell
npm audit --omit=dev --json
```

Resultado: 0 vulnerabilidades.

Auditoria completa:

```powershell
npm audit --json
```

Resultado restante:

- `esbuild <=0.24.2`: vulnerabilidade moderada relacionada ao servidor de desenvolvimento.
- `vite <=6.4.2`: vulnerabilidade alta relacionada ao servidor de desenvolvimento.

Observação técnica:

A correção indicada pelo npm exige `npm audit fix --force`, instalando `vite@8.1.5`. Por ser upgrade major do build tool, a decisão correta é tratar em etapa controlada, com validação de compatibilidade, build, testes, Docker e CI/CD antes de liberar para homologação.

## Validação executada

Comandos executados após a correção:

```powershell
npm run lint
npm test
npm run build
```

Resultados:

- `npm run lint`: passou sem erro. Permanece 1 aviso conhecido de `react-refresh/only-export-components` em `src/components/documentos/DocumentVisualSystem.tsx`.
- `npm test`: passou com 13 testes aprovados em 2 arquivos.
- `npm run build`: passou com Vite 5.4.21.

Avisos conhecidos:

- O build ainda informa Browserslist/caniuse-lite desatualizado.
- A tentativa de `npx update-browserslist-db@latest` falhou porque o utilitário tentou executar `bun info caniuse-lite --json` e `bun` não está disponível neste ambiente.

## Impacto para homologação

Não houve alteração de tela, fluxo, documento ou banco de dados.

O impacto prático foi reduzir vulnerabilidades resolvíveis dentro do lockfile, mantendo a aplicação funcional e preservando a validação em andamento com a equipe.

## Pendências controladas

As pendências abaixo permanecem alocadas na Etapa 8:

- Avaliar upgrade major do Vite para versão segura mais recente, com matriz de regressão de frontend, Docker e CI/CD.
- Atualizar Browserslist/caniuse-lite em ambiente onde o utilitário não dependa de Bun, ou configurar a ferramenta corretamente.
- Reexecutar `npm audit` completo, `npm audit --omit=dev`, `npm run lint`, `npm test`, `npm run build` e validação visual após o upgrade major.

