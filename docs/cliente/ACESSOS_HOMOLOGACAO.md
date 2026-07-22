# Acessos de Homologacao

Ambiente: Homologacao

URL: https://fieldops-homologacao.atenza.digital/login

Versao: `0.6.3`

Identidade: o favicon global e a tela de login usam a identidade Atenza FieldOps. A logo do tenant aparece somente depois do login e nos documentos parametrizados.

## Politica de teste

- Cada area deve usar sua propria conta de homologacao.
- A senha inicial e temporaria e deve ser trocada no primeiro acesso.
- Nao compartilhar a conta administrativa para testes de rotina.
- Se uma senha temporaria for perdida, gerar uma nova pela tela de Usuarios ou pelo comando interno de preparacao.

## Contas por perfil

| Area | E-mail | Perfil principal | Uso recomendado |
| --- | --- | --- | --- |
| Comercial | homolog.comercial@atenza.digital | comercial + admin_empresa | Comercial e gestao administrativa do tenant |
| Operacao | homolog.operacao@atenza.digital | operacao + administrativo + admin_empresa | Operacao e gestao administrativa do tenant |
| Qualidade | homolog.qualidade@atenza.digital | responsavel_tecnico | Certificados, historico, QR Code e validacao |
| Medicao | homolog.medicao@atenza.digital | financeiro | Medicoes, NF, cobranca e baixa manual no ERP |

## Regerar usuarios de homologacao

```bash
npm run homologation:users -- --reset-passwords
```

O comando exibe as senhas temporarias apenas no terminal e nao grava as senhas em arquivo.

Para a rodada atual, a senha temporaria da conta operacional deve ser solicitada separadamente a Atenza. Ela e redefinida pelo workflow `Provisionar Usuario de Homologacao`, fica marcada para troca no primeiro acesso e nao e armazenada neste documento, no Git ou nos logs da aplicacao.

As duas contas acima sao excecoes controladas da homologacao para permitir o teste integrado e a gestao de usuarios/perfis pela Ciperprag. Novos usuarios comerciais ou operacionais nao recebem `admin_empresa` automaticamente.
