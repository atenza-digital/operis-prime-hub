# Ajustes da validacao assistida - 2026-07-21

## Escopo

Rodada de correcoes baseada no roteiro `Roteiro_Validacao_Final_Atenza_FieldOps_Tarcisio_v1.4.docx`.

## Entregue

- Cards do Fluxo recomendado reorganizados para preservar largura, altura e quebra de texto em telas menores.
- Contratos ordenados por data de criacao mais recente.
- Blocos de assinatura de proposta, minuta e contrato protegidos contra divisao e com altura reservada para evitar desalinhamento.
- Agenda explicita equipe e veiculo designados no detalhe do agendamento.
- Certificados por TAG: cada TAG registrada na OS gera seu proprio certificado, hash, snapshot e anexo historico; o hash principal da OS permanece compativel.
- QR Code prioriza a origem publica atual e o deploy configura `PUBLIC_APP_URL` da homologacao.
- Certificados listam a TAG atendida e informam quando mais de um certificado foi gerado.

## Validacao tecnica

- `npm test -- --run`: 25 testes aprovados.
- `npm run lint`: 0 erros; permanece 1 warning preexistente de Fast Refresh em `DocumentVisualSystem.tsx`.
- `npm run build`: aprovado.
- `node --check server/index.mjs`: aprovado.
- Rota local `GET /api/certificates/HSH-2026-WPN6-XB9L`: HTTP 200.
- Coluna `certificados.tag_equipamento_servico`: criada/verificada no banco local Docker.

## Pendencia de homologacao

A leitura fisica do QR Code em tela e no PDF impresso ainda deve ser repetida pelo usuario com celular. Esta rodada deve ser validada junto com COM-01, COM-03, COM-05, OP-01, OP-04, QL-03 e FINAL-05.
