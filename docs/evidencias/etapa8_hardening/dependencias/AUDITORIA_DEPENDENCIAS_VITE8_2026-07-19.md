# Auditoria de Dependências - Upgrade Vite 8

Data: 19/07/2026  
Branch: `homologacao/p0-relatorios-tecnicos`  
Commit base anterior: `e37a9f4`  
Objetivo: concluir a pendência de hardening técnico de dependências, eliminando os achados restantes de `vite/esbuild` sem publicar em homologação durante os testes assistidos.

## Alterações aplicadas

Dependências de desenvolvimento atualizadas:

```text
@vitejs/plugin-react-swc: ^3.11.0 -> ^4.3.1
vite: ^5.4.19 -> ^8.1.5
vitest: ^3.2.4 -> ^4.1.10
```

Browserslist/caniuse-lite foi atualizado via npm:

```powershell
npm update caniuse-lite browserslist
```

O atualizador oficial `npx update-browserslist-db@latest` continuou falhando neste ambiente Windows porque tentou executar `bun`, que não está instalado. A atualização via `npm update` resolveu o aviso sem adicionar dependências diretas ao `package.json`.

## Versões finais verificadas

```text
vite: declared=^8.1.5 installed=8.1.5
vitest: declared=^4.1.10 installed=4.1.10
@vitejs/plugin-react-swc: declared=^4.3.1 installed=4.3.1
caniuse-lite: installed=1.0.30001806
browserslist: installed=4.28.6
```

## Validação executada

Comandos:

```powershell
npm audit
npm run lint
npm test
npm run build
```

Resultados:

- `npm audit`: 0 vulnerabilidades.
- `npm run lint`: passou sem erro; permanece 1 aviso conhecido de Fast Refresh em `src/components/documentos/DocumentVisualSystem.tsx`.
- `npm test`: 13 testes passaram em 2 arquivos com Vitest 4.1.10.
- `npm run build`: passou com Vite 8.1.5.
- O aviso de Browserslist/caniuse-lite desatualizado não apareceu após `npm update caniuse-lite browserslist`.

## Observações técnicas

Durante o upgrade, o npm em Windows exibiu avisos de limpeza de diretórios temporários antigos em `node_modules` por arquivos nativos bloqueados. A instalação terminou com sucesso e a validação posterior confirmou `npm audit` zerado.

O Vitest/Vite exibiu recomendação informativa para avaliar `@vitejs/plugin-react` no futuro, pois não há plugins SWC customizados em uso. Isso não bloqueia homologação nem produção, mas pode ser reavaliado em otimização futura se houver ganho mensurável.

## Impacto

Não houve alteração funcional de telas, documentos, banco de dados ou fluxo de negócio.

A mudança fica restrita ao toolchain de frontend/testes/build e ao lockfile.

