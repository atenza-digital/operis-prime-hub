import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildOsPrintHtml } from '../src/lib/osPrint';
import { MeasurementPrintSaas } from '../src/pages/Medicao';
import { documentTypographyCss } from '../src/lib/documentFontFaces';
import type { BootstrapData, OSApp, MedicaoApp } from '../src/lib/api';
export { buildCertificateHtml } from '../src/components/CertificadoImpressao';
export { documentTypographyCss } from '../src/lib/documentFontFaces';

// Database snapshots carry family-specific keys; the public renderers validate their outputs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>;
export function buildOrderHtml(snapshot: Data, order: Data) {
  const phase = snapshot.encerramento || snapshot.emissao || {};
  const os = { numero: order.numero, id: order.id, clienteId: order.cliente_id, clienteNome: phase.cliente?.nome,
    clienteCnpj: phase.cliente?.cnpj, clienteEndereco: phase.cliente?.endereco, contratoId: order.contrato_id,
    servico: order.servico, tipo: order.tipo, tecnicoNome: order.tecnico, localExecucao: order.local_execucao,
    quantidade: Number(order.quantidade), unidade: order.unidade, atividades: phase.operacao?.atividades || order.atividades || [],
    dataEmissao: String(order.data_emissao?.toISOString?.() || order.data_emissao || '').slice(0,10),
    dataExecucao: String(order.data_execucao?.toISOString?.() || order.data_execucao || '').slice(0,10),
    equipeTecnicosNomes: order.equipe_tecnicos_nomes || [], tags: order.tags, tagEquipamentoServico: order.tag_equipamento_servico,
    observacao: order.observacao, naoExecutada: order.nao_executada, motivoNaoExecucao: order.motivo_nao_execucao,
    status: order.status, fotos: [], snapshotDados: snapshot } as OSApp;
  const bootstrap = { companyConfig: phase.empresa, contracts: [], clients: [], services: [], technicians: [] } as unknown as BootstrapData;
  return buildOsPrintHtml(os, { bootstrap });
}

export function buildMeasurementHtml(snapshot: Data, measurement: Data, css: string) {
  const item = { id: measurement.id, numero: measurement.numero, clienteNome: snapshot.cliente.nome, clienteCnpj: snapshot.cliente.cnpj,
    clienteEndereco: snapshot.cliente.endereco, periodoInicio: snapshot.periodo.inicio, periodoFim: snapshot.periodo.fim,
    criadoEm: snapshot.emitidoEm, status: 'emitida', total: snapshot.total, itens: snapshot.itens,
    snapshotDados: snapshot, formaPagamento: snapshot.formaPagamento, localEntrega: snapshot.localEntrega } as MedicaoApp;
  const markup = renderToStaticMarkup(<MeasurementPrintSaas measurement={item} data={{ companyConfig: snapshot.empresa } as BootstrapData} />);
  const safe = (value: unknown) => String(value || '').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${safe(measurement.numero)}</title><meta name="author" content="${safe(snapshot.empresa?.razaoSocial)}"><meta name="subject" content="Medição de serviços - ${safe(snapshot.cliente.nome)}"><style>${css}\n${documentTypographyCss}\n@page {size:A4;margin:8mm 0 12mm;@bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:Montserrat;font-size:7pt;margin-right:13mm;}} body:has(.document-print-root) .document-print-root{position:static!important;}</style></head><body>${markup}</body></html>`;
}
