# Preflight de storage R2

Gerado em: 19/07/2026, 21:49
Tenant: ciperprag
Modo: somente leitura

## Status

- Provider solicitado: database.
- Provider ativo: database.
- Bucket configurado: nao.
- Credenciais R2 completas: nao.
- Pronto para apply R2: nao.
- Anexos pendentes para migracao: 26.

## Distribuicao atual por provider

| Provider | Total |
| --- | --- |
| database | 26 |

## Pendencias por tipo/categoria

| Entidade | Categoria | Total | Bytes informados |
| --- | --- | --- | --- |
| certificado | pdf_historico | 1 | 685 |
| medicao | pdf_historico | 1 | 917 |
| minuta | documento | 1 | 35 |
| minuta | pdf_historico | 1 | 2355 |
| os | foto | 20 | 516 |
| os | pdf_historico | 1 | 1376 |
| proposta | pdf_historico | 1 | 2516 |

## Amostra de 5 candidato(s)

| ID | Entidade | Entidade ID | Categoria | Arquivo | MIME | Bytes | Chave planejada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EV-OS-2670-01 | os | OS-2670 | foto | evidencia-01.jpg | image/jpeg |  | (sem bucket configurado) |
| EV-OS-2670-02 | os | OS-2670 | foto | evidencia-02.jpg | image/jpeg |  | (sem bucket configurado) |
| EV-OS-2670-03 | os | OS-2670 | foto | evidencia-03.jpg | image/jpeg |  | (sem bucket configurado) |
| EV-OS-2671-01 | os | OS-2671 | foto | evidencia-01.jpg | image/jpeg |  | (sem bucket configurado) |
| EV-OS-2671-02 | os | OS-2671 | foto | evidencia-02.jpg | image/jpeg |  | (sem bucket configurado) |

## Proxima acao recomendada

- Nao executar `apply` ainda. Configurar secrets/variaveis `R2_BUCKET_DOCUMENTS`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `DOCUMENT_STORAGE_PROVIDER=r2` no fluxo de execucao controlado.
