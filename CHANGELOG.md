# Changelog

## Não lançado

- feat: CNPJ secundário da empresa (migration 031), exibido no rodapé da OS e no rodapé do certificado; removido CNPJ fixo de fallback da OS.
- feat: assinatura do responsável técnico (imagem configurada) na OS impressa.
- feat: validade do certificado ajustável no encerramento da OS (dias, opcional; padrão do serviço quando vazio).
- feat: agendamento aceita vários locais de execução (um por linha, gravados separados por "; ") e TAGs livres além das cadastradas.
- fix: QR Code do certificado maior (23 mm), com margem de silêncio e imagem nítida; URL do QR só usa origem HTTPS com domínio (nunca IP, http ou localhost).
- fix: OS impressa sem função e CPF do técnico.
- fix: anexo histórico da OS oculto na tela da OS e rotulado como "Registro de auditoria" na Auditoria de Anexos.
- fix: lista de certificados com o mais recente primeiro e TAGs da mesma OS em ordem crescente.
- feat: validade do certificado em 30/90/120 dias (cadastro do serviço e encerramento da OS) e "Vence em" no card do certificado.
- docs: texto do Relatório técnico reescrito em linguagem simples (o que é, quando usar, como gerar).
- fix: agendamento casa contratos por cliente (id ou nome) e informa quando o contrato não está disponível para o cliente.
- feat: fotos por TAG no encerramento da OS; cada certificado leva somente as fotos da sua TAG (até 3 por TAG).
- feat: cadastro de cliente bloqueia CNPJ ou razão social já existentes (409) e avisa ao digitar o CNPJ; id de cliente sem risco de colisão.
- docs: texto de ajuda no agendamento explicando contrato com saldo x serviço avulso.
- feat: agendamento com vários serviços no mesmo atendimento (uma OS por serviço, ligadas por grupo; migration 032).
- fix: OS impressa segue o modelo original da cliente (textos de Medidas Preventivas, Obrigações, treinamentos NR35/NR33/NR12, emergência), com quantidade em branco para a equipe de campo, um bloco de observação por serviço e "Altura SIM( ) NÃO( )" para caixa d água; OS agrupadas saem em um documento só.
- chore: deploy de homologação espera o health check por até 60 s (antes 5 s) e mostra logs do container na falha.
- fix: agendamento com contrato agora lista serviços do catálogo como extras (antes o bloco ficava vazio quando o cliente tinha um só contrato).
- fix: agendamento sem o campo "Origem do atendimento"; um único seletor Contrato / Serviço (contratos com saldo e serviços avulsos).
- fix: agendamento mostra o que falta para liberar o botão e avisa quando o serviço do contrato está inativo no catálogo.
- fix: encerramento da OS com fotos por TAG não envia mais cada foto duas vezes; limite da requisição subiu para 30 MB.
- fix: encerrar OS não exige mais foto nem TAG (foto obrigatória do serviço deixou de bloquear); data de execução vazia agora avisa.
- fix: diálogos (inclusive Encerrar OS) rolam e se ajustam a telas pequenas; campos em uma coluna no celular.
- perf: listagem (bootstrap) deixa de trazer fotos e snapshots pesados das OS e certificados; fotos carregam ao abrir a OS, imprimir certificado ou relatório técnico (/orders/:id/detalhe e /certificates/:id/detalhe).
