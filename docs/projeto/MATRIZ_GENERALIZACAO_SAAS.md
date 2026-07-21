# Matriz de generalizacao SaaS

## Principio

O Atenza FieldOps deve diferenciar nucleo global da plataforma, configuracoes por tenant, modulos opcionais e particularidades da Ciperprag. Qualquer comportamento especifico de uma empresa deve ser parametrizado, isolado como extensao ou mantido fora do nucleo.

## Classificacao

| Comportamento / dado | Classificacao | Status atual | Risco | Acao recomendada |
| --- | --- | --- | --- | --- |
| Nome Atenza FieldOps | Nucleo global | Confirmado | Baixo | Preservar em login, metadados e documentos da plataforma. |
| Favicon global Atenza | Nucleo global | Parcial | Alto | Remover favicon de tenant como padrao global. |
| Logo no menu autenticado | Parametrizavel | Parcial | Medio | Usar asset do tenant com fallback neutro. |
| Dados cadastrais da empresa emissora | Parametrizavel | Parcial | Alto | Sempre buscar de `empresa_config`. |
| Cores do tenant | Parametrizavel | Parcial | Medio | Limitar paleta validada e acessivel. |
| Assinatura em documentos | Parametrizavel | Parcial | Medio | Evoluir por usuario/perfil documental. |
| Certificados | Modulo opcional | Parcial | Medio | Habilitar por servico/tenant/plano. |
| Validacao publica por QR Code | Nucleo global para certificado | Parcial | Medio | Manter antifraude, adicionar snapshot imutavel. |
| Controle de pragas | Especifico da Ciperprag/segmento | Parcial | Alto | Nao fixar nomenclatura no nucleo. |
| Vigilancia sanitaria | Parametrizavel | Parcial | Medio | Campo opcional por tenant/documento. |
| Categorias sanitarias | Parametrizavel | Parcial | Medio | Transformar em catalogo/taxonomia configuravel. |
| POP | Parametrizavel | Parcial | Medio | Permitir cadastro estruturado ou upload de POP pronto. |
| EPIs | Parametrizavel | Parcial | Medio | Catalogo por servico/tenant. |
| Normas | Parametrizavel | Parcial | Medio | Referencias por servico/tenant. |
| Checklist | Parametrizavel | Parcial | Alto | Checklist versionado por servico/POP. |
| Exige foto | Parametrizavel | Parcial | Medio | Configurar por servico. |
| Limite de 3 fotos no certificado | Parametrizavel | Parcial | Medio | Manter default 3, permitir ajuste por template. |
| Nao execucao | Parametrizavel | Parcial | Medio | Configurar por servico/tenant. |
| Periodicidade/recorrencia | Parametrizavel | Parcial | Medio | Regras por servico e contrato. |
| Medicao | Nucleo global | Parcial | Alto | Consolidar OS e acompanhar ERP manualmente. |
| Cobranca/pagamento no ERP | Nucleo global do escopo atual | Parcial | Medio | Manter como acompanhamento, nao financeiro formal. |
| Contrato do cliente | Nucleo global | Parcial | Medio | Caminho alternativo para qualquer tenant. |
| Modelo documental Ciperprag | Especifico da Ciperprag | Parcial | Alto | Tratar como template do tenant, nao global. |
| `schema ciperprag_hub` | Debito tecnico | Implementado | Alto | Planejar renomeacao/abstracao futura. |
| Backfills com `slug = 'ciperprag'` | Especifico da homologacao | Implementado | Alto | Nao reutilizar para provisionamento geral. |
| Usuarios/perfis por tenant | Nucleo global | Parcial | Alto | Criar matriz granular. |
| Admin global Atenza | Nucleo global | Ausente | Critico | Implementar painel SaaS. |
| Plano/assinatura/suspensao | Nucleo global SaaS | Ausente | Critico | Implementar governanca Atenza. |
| Storage de anexos | Nucleo global | Parcial | Alto | Migrar base64 para storage controlado. |
| PDF server-side | Nucleo global | Parcial | Critico | Implementar por tipo documental. |

## Acoplamentos diretos a revisar

| Local | Acoplamento | Tipo | Acao |
| --- | --- | --- | --- |
| `index.html` | favicon pode apontar para asset Ciperprag | Branding | Usar favicon Atenza. |
| `src/assets/logo_ciperprag*` | assets fixos de tenant no codigo | Tenant | Usar apenas como seed/fallback de homologacao controlado. |
| `database/migrations/*` | backfill com `slug = 'ciperprag'` | Homologacao | Criar provisionamento generico. |
| `server/db.mjs` | schema `ciperprag_hub` | Tecnico | Planejar schema generico ou abstracao. |
| Documentos historicos | modelos Ciperprag como referencia | Tenant | Versionar por tenant. |

## Decisao de produto

Particularidades de cliente devem seguir esta ordem:

1. Parametro do tenant.
2. Configuracao por servico/produto.
3. Modulo opcional por plano.
4. Extensao controlada isolada.
5. Nunca condicional fixa por nome/ID do tenant.

