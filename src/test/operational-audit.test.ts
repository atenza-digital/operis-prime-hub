import { describe, expect, it } from 'vitest';
import { operationalAuditPolicy } from '../../scripts/lib/operational-audit-policy.mjs';

describe('classificacao da auditoria operacional', () => {
  it('nao exige minuta quando o tenant desabilitou o recurso', () => {
    const result = operationalAuditPolicy('Propostas aprovadas sem minuta gerada identificada', 5, { allowMinutaGeneration: false });
    expect(result.status).toBe('Nao aplicavel');
    expect(result.action).toContain('nao gerar');
  });
  it('preserva contratos desativados sem apagar os registros historicos', () => {
    expect(operationalAuditPolicy('Minutas aprovadas sem contrato final gerado identificado', 1, { allowContractGeneration: false }).status).toBe('Nao aplicavel');
  });
  it('nao transforma planejamento e faturamento pendentes em erro de integridade', () => {
    for (const title of ['Agendamentos em aberto sem OS gerada', 'OS encerradas sem medicao vinculada']) {
      expect(operationalAuditPolicy(title, 2, {}).status).toBe('Conferir fluxo');
    }
  });
  it('continua destacando falta de snapshot ou PDF imutavel', () => {
    for (const title of ['OS encerradas sem snapshot de encerramento', 'Certificados emitidos sem documento historico imutavel']) {
      expect(operationalAuditPolicy(title, 1, {}).status).toBe('Revisar integridade');
    }
  });
  it('classifica contagem zero como OK e vinculo textual habilitado como conferencia', () => {
    const title = 'Propostas aprovadas sem minuta gerada identificada';
    expect(operationalAuditPolicy(title, 0, {}).status).toBe('OK');
    expect(operationalAuditPolicy(title, 1, { allowMinutaGeneration: true }).status).toBe('Conferir fluxo');
  });
});
