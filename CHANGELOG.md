# Changelog

## Não lançado

- feat: CNPJ secundário da empresa (migration 031), exibido no rodapé da OS e no rodapé do certificado; removido CNPJ fixo de fallback da OS.
- feat: assinatura do responsável técnico (imagem configurada) na OS impressa.
- feat: validade do certificado ajustável no encerramento da OS (dias, opcional; padrão do serviço quando vazio).
- feat: agendamento aceita vários locais de execução (um por linha, gravados separados por "; ") e TAGs livres além das cadastradas.
- fix: QR Code do certificado maior (23 mm), com margem de silêncio e imagem nítida; URL do QR só usa origem HTTPS com domínio (nunca IP, http ou localhost).
