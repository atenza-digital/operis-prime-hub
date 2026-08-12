# Evidencia - revogacao e reemissao de certificados

Data: 2026-08-12
Ambiente: desenvolvimento/local; nao publicado nesta rodada
Escopo: AF-P1-006 / RN-CER-004

## Entregue

- Migration `027_certificate_revocation_reissue.sql` adiciona os vinculos entre documento substituido e substituto.
- `PATCH /api/certificates/:id/revoke` exige permissao `certificados.manage`, tenant autenticado e motivo com pelo menos cinco caracteres.
- `POST /api/certificates/:id/reissue` cria novo certificado a partir da mesma OS e TAG, revoga o anterior, registra o motivo e vincula os dois registros.
- As alteracoes sao transacionais e registradas na auditoria como `certificate_revoked` ou `certificate_reissued`.
- O modulo de certificados possui filtro e badge `Revogado`, alem das acoes de gestao para usuarios autorizados.
- A validacao publica continua retornando `certificateStatus = revogado`, motivo e status visual de documento nao valido.

## Invariantes

- Nenhuma consulta de revogacao ou reemissao aceita certificado de outro tenant.
- Certificado ja revogado nao pode ser revogado novamente nem reemitido novamente.
- Reemissao usa a OS de origem e limita a nova emissao a TAG do certificado selecionado.
- O certificado antigo permanece no historico; nao ha exclusao fisica.
- O hash e o snapshot do novo certificado sao independentes do documento anterior.

## Validacao tecnica executada

- `node --check server/index.mjs`
- `node --check server/commercial-visibility.mjs`
- Suite Vitest e build serao executados antes do commit.
- A migration foi adicionada ao repositorio e tambem e garantida pelo `ensureDatabaseShape` para ambientes existentes.

## Pendencia de homologacao

Executar em ambiente de homologacao com usuario autorizado:

1. Emitir ou selecionar certificado valido.
2. Revogar informando motivo e confirmar que permanece no historico.
3. Consultar o QR/URL publica e conferir status revogado.
4. Emitir substituto a partir do certificado original e conferir os vinculos.
5. Confirmar que usuario sem `certificados.manage` recebe bloqueio.
