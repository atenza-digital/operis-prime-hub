# Correções para revalidação do Tarcísio

## Escopo

Rodada baseada no retorno da validação completa da Ciperprag. O objetivo é corrigir os itens com reprovação ou ressalva sem reformular os layouts documentais já aprovados.

## Correções aplicadas

- **COM-02/COM-03:** o item comercial passou a usar o nome e a unidade do catálogo de serviços como origem documental. A tela não exibe mais os campos de descrição comercial e unidade manual; passou a solicitar o endereço da atividade por serviço. O endereço é persistido em `contratos_templates_servicos.endereco_atividade` e reaparece na proposta/contrato quando não houver local geral informado.
- **QL-01:** o certificado usa o `brandIconUrl`/`arteFundoUrl` do tenant como marca-d'água e, quando o ícone não estiver configurado, usa a logo documental do próprio tenant como fallback. Não existe fallback fixo para Ciperprag.
- **FIN-01:** a configuração do tenant passou a permitir responsável, cargo e modo da assinatura da medição (`linha`, `imagem` ou `ocultar`). O PDF usa o responsável pela emissão configurado, preservando o snapshot da medição e evitando usar automaticamente o responsável pela execução.
- **QL-03:** relatórios técnicos agora ordenam as OS pela data de execução/emissão em ordem decrescente, com desempate pelo número da OS.

## Verificação técnica

- `npm run build`: aprovado.
- `npm test`: 3 arquivos, 25 testes aprovados.
- `npm run lint`: sem erros; permanece apenas o aviso preexistente de Fast Refresh em `DocumentVisualSystem.tsx`.
- `git diff --check`: aprovado.
- Migração criada: `database/migrations/023_contract_template_service_activity_address.sql`.
- O servidor também garante a coluna com `ADD COLUMN IF NOT EXISTS` no bootstrap do banco.

## Roteiro atualizado

Arquivo para nova rodada: `docs/cliente/homologacao_roteiros/Roteiro_Validacao_Completo_Atenza_FieldOps_Ciperprag_v1.7.docx`.

O roteiro inclui os testes `COM-02-R`, `COM-03-R`, `QL-01-R`, `FIN-01-R` e `QL-03-R`, além da matriz completa anterior. Senhas continuam fora do arquivo e devem ser entregues separadamente.

## Pendência de validação externa

O Tarcísio precisa repetir os cinco cenários no ambiente de homologação e classificar cada um como aprovado, aprovado com observação, reprovado ou não testado, anexando prints/documentos quando houver divergência.

## Limitação da geração do roteiro

O DOCX foi gerado e validado estruturalmente com `python-docx` (110 parágrafos, 13 tabelas e 12 imagens). A renderização automática para PNG não foi executada porque o ambiente local não possui LibreOffice/`soffice` instalado.
