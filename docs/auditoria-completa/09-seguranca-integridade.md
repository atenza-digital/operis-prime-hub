# Seguranca, integridade e auditoria

## Pontos positivos

- Login interno com senha hash `scrypt`.
- Token de sessao opaco armazenado com hash.
- Sessao com expiracao.
- Bloqueio temporario apos tentativas invalidas.
- Auditoria de login, logout, alteracoes e downloads.
- Permissoes no backend via `requirePermission`.
- Download de anexos valida tenant e permissao.
- Rotas protegidas no frontend.

## Riscos e lacunas

| ID | Achado | Severidade | Recomendacao |
| --- | --- | --- | --- |
| SEC-01 | Sem testes automatizados de IDOR por endpoint. | Critico | Criar suite com dois tenants e IDs cruzados. |
| SEC-02 | Sem RLS no banco. | Alto | Avaliar RLS ou camada de repository com asserts obrigatorios. |
| SEC-03 | Payload JSON de 15 MB para fotos base64. | Alto | Migrar uploads para storage controlado e validacao de arquivo. |
| SEC-04 | Sem antivirus/validacao robusta de anexos. | Alto | Validar mime, extensao, tamanho e scanner em producao. |
| SEC-05 | Sem gestao de sessoes ativas na UI. | Medio | Permitir revogar sessoes e ver acessos. |
| SEC-06 | Sem recuperacao de senha por e-mail. | Medio | Integrar e-mail noreply Atenza e futuramente Google login. |
| SEC-07 | Sem painel global Atenza. | Critico | Criar controle de tenants, planos, suspensao e suporte. |
| SEC-08 | Certificado publico por hash precisa rate limit. | Medio | Aplicar rate limit e logs de consulta publica. |
| SEC-09 | Dados sensiveis em logs devem ser revisados. | Medio | Mascarar CNPJ/e-mail quando necessario. |

## Integridade documental

| Documento | Estado atual | Risco |
| --- | --- | --- |
| OS | HTML/print e historico parcial | Variacao por navegador e ausencia de PDF final uniforme. |
| Certificado | QR/hash e snapshot parcial | Precisa PDF final server-side e snapshot imutavel completo. |
| Medicao | Layout aprovado em homologacao | Precisa historico de versoes e PDF final. |
| Proposta | Layout formal | Precisa aceite/versionamento. |
| Contrato | Layout formal | Precisa clausulas versionadas por tenant. |

