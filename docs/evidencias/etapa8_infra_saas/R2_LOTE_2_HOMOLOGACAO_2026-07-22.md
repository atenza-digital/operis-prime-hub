# Segundo lote de migracao R2 em homologacao

## Resultado

**Aprovado.** O segundo lote foi executado pela CI/CD com `keep_database_copy=true`.

- Workflow de migracao: [Storage R2 Migration Homologacao](https://github.com/atenza-digital/operis-prime-hub/actions/runs/29883935132)
- Tenant: `ciperprag`
- Filtros: entidade `os`, categoria `foto`
- Limite solicitado: 10
- Registros enviados ao R2: 10
- Registros avaliados no pos-migracao: 10
- Falhas de leitura, hash ou tamanho: 0

## Validacao pela aplicacao

Depois do lote, o deploy controlado executou novamente o smoke autenticado da aplicacao:

- Deploy: [Deploy Homologacao VPS](https://github.com/atenza-digital/operis-prime-hub/actions/runs/29883983839)
- Anexos catalogados pelo bootstrap: 68
- Amostras visualizadas e baixadas pela rota autenticada: 8
- Falhas no download ou na conferencia do SHA-256: 0
- Auditorias de consistencia e isolamento: aprovadas
- Smoke publico: aprovado

O smoke da aplicacao trabalha por amostragem e nao identifica no log publico quais das oito amostras coincidiram com os dez registros recem-migrados. Por isso, a evidencia confirma o funcionamento do fluxo autenticado apos a expansao, enquanto a verificacao direta confirma individualmente os dez registros do lote.

## Decisao

O rollout pode continuar em lotes graduais, sempre mantendo copia no banco. Nao remover `conteudo_base64` nesta fase. Antes de uma migracao ampla, executar novo lote controlado e acompanhar falhas, latencia, restauracao e backup.

