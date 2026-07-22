# Validacao do download de anexos R2 pela aplicacao

## Contexto

- Ambiente: homologacao
- URL: https://fieldops-homologacao.atenza.digital
- Tenant: `ciperprag`
- Workflow: [Deploy Homologacao VPS](https://github.com/atenza-digital/operis-prime-hub/actions/runs/29882972879)
- Commit implantado: `dce81077c85ff7cd17126f06d34c270d40ed453b`
- Executado em: 22/07/2026

## Resultado

**Aprovado.** O pipeline oficial concluiu com sucesso todas as etapas de qualidade, implantacao e validacao pos-deploy.

O smoke `homologation:attachments` executou dentro do container da VPS e validou, para amostras do tenant:

- login tecnico sem registrar senha no relatorio;
- bootstrap autenticado com catalogo de anexos;
- visualizacao pela rota autenticada;
- download pela mesma rota com `download=1`;
- resposta HTTP e corpo nao vazio;
- `Content-Type`, `Content-Disposition` e provedor de storage;
- hash SHA-256 do corpo recebido comparado ao hash persistido;
- validacao de visualizacao e download para cada amostra.

O apply piloto anterior enviou cinco fotos de OS ao R2 com `keep_database_copy=true`. O smoke confirmou que a aplicacao consegue servir os anexos pelo fluxo autenticado, preservando a copia no banco durante o rollout.

## Demais gates do deploy

- Lint: aprovado.
- Testes automatizados: aprovados.
- Build Docker: aprovado.
- Health check e troca controlada do container: aprovado.
- Reparo de hashes legados: aprovado.
- Reparo de numeracao documental: aprovado.
- Auditorias de consistencia e isolamento: aprovadas.
- Smoke publico: aprovado.

## Decisao operacional

O piloto R2 pode permanecer ativo em homologacao. A proxima ampliacao deve ser outro lote pequeno e observavel, mantendo `keep_database_copy=true` ate haver historico suficiente de estabilidade. A remocao de base64 do banco fica bloqueada ate a aprovacao explicita da estrategia de rollback e backup.

