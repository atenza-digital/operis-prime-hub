import express from "express";
import cors from "cors";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { authenticateToken, changePassword, hashPassword, loginWithPassword, normalizeEmail, revokeSession } from "./auth.mjs";
import { ensureDatabaseShape, pool, query, withTransaction } from "./db.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json({ limit: "15mb" }));

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || null;
}

function getBearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  return authorization.slice(7).trim();
}

async function requireAuth(req, res, next) {
  try {
    const auth = await authenticateToken(getBearerToken(req));
    if (!auth) return res.status(401).json({ error: "Sessao expirada ou nao autenticada." });
    req.auth = auth;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requirePermission(...permissions) {
  return (req, res, next) => {
    if (req.auth?.user?.senhaTemporaria) {
      return res.status(428).json({ error: "Troca de senha obrigatoria antes de continuar." });
    }
    const granted = new Set(req.auth?.user?.permissoes || []);
    if (permissions.some((permission) => granted.has(permission))) return next();
    return res.status(403).json({ error: "Usuario sem permissao para esta acao." });
  };
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function buildCertificateStatus(dataExecucao, validadeDias) {
  if (!validadeDias) return "valid";
  const expiry = new Date(`${addDays(dataExecucao, validadeDias)}T23:59:59`);
  return expiry.getTime() < Date.now() ? "expired" : "valid";
}

async function generateUniqueCertificateHash(db = { query }) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < 8; index += 1) {
      suffix += chars[Math.floor(Math.random() * chars.length)];
    }
    const hash = `HSH-${new Date().getFullYear()}-${suffix.slice(0, 4)}-${suffix.slice(4)}`;
    const { rows } = await db.query("SELECT 1 FROM ciperprag_hub.certificados WHERE hash = $1 LIMIT 1", [hash]);
    if (!rows.length) return hash;
  }
  throw new Error("Nao foi possivel gerar um hash unico para o certificado.");
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function formatSequential(format, value) {
  const year = new Date().getFullYear();
  return String(format || "CERT-{SEQ}/{ANO}")
    .replaceAll("{SEQ}", String(value).padStart(3, "0"))
    .replaceAll("{ANO}", String(year));
}

function parseDataUrl(dataUrl) {
  const value = String(dataUrl || "");
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { mimeType: null, base64Data: value, bytes: null };
  const base64Data = match[2];
  return {
    mimeType: match[1],
    base64Data,
    bytes: Math.floor((base64Data.length * 3) / 4) - (base64Data.endsWith("==") ? 2 : base64Data.endsWith("=") ? 1 : 0),
  };
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlList(items = []) {
  return items.length ? `<ul>${items.map((item) => `<li>${htmlEscape(item)}</li>`).join("")}</ul>` : "<p>-</p>";
}

function encodeHtmlDocument(html) {
  const base64 = Buffer.from(html, "utf8").toString("base64");
  return {
    dataUrl: `data:text/html;base64,${base64}`,
    bytes: Buffer.byteLength(html, "utf8"),
    hash: crypto.createHash("sha256").update(html, "utf8").digest("hex"),
  };
}

function decodeStoredAttachmentContent(content) {
  const value = String(content || "");
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
  }
  return { mimeType: null, buffer: Buffer.from(value, "utf8") };
}

function attachmentPermissionFor(entityType) {
  const map = {
    os: "os.manage",
    certificado: "certificados.manage",
    medicao: "medicoes.manage",
    servico_pop: "servicos.manage",
    cliente: "clientes.manage",
    contrato: "contratos.manage",
  };
  return map[entityType] || "dashboard.view";
}

async function logAuditEvent(db, req, { entityType, entityId = null, action, summary, before = null, after = null }) {
  try {
    const runner = db?.query ? db : { query };
    await runner.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo, dados_antes, dados_depois, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        req.auth?.user?.tenant?.id || null,
        req.auth?.user?.id || null,
        entityType,
        entityId,
        action,
        summary,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        getRequestIp(req),
        req.headers["user-agent"] || null,
      ],
    );
  } catch (error) {
    console.warn("Falha ao registrar auditoria", error.message);
  }
}

async function saveImmutableDocumentAttachment(client, { tenantId, userId, entityType, entityId, fileName, html, metadata = {} }) {
  const encoded = encodeHtmlDocument(html);
  await client.query(
    `INSERT INTO ciperprag_hub.evidencias_anexos
     (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, hash_sha256, imutavel, criado_por)
     VALUES ($1,$2,$3,$4,'pdf_historico',$5,'text/html',$6,$7,$8,$9,TRUE,$10)
     ON CONFLICT (id) DO NOTHING`,
    [
      makeId("DOC"),
      tenantId,
      entityType,
      entityId,
      fileName,
      encoded.bytes,
      encoded.dataUrl,
      JSON.stringify({ ...metadata, formato: "html_historico", hashSha256: encoded.hash }),
      encoded.hash,
      userId || null,
    ],
  );
}

function buildHistoricalOrderHtml(snapshot, order) {
  const data = snapshot.encerramento || snapshot.emissao || {};
  const servico = data.servico || {};
  const pop = servico.pop || {};
  const operacao = data.operacao || {};
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(order.numero)}</title><style>body{font-family:Arial,sans-serif;color:#111;padding:28px}h1{color:#065f46}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #999;padding:7px;text-align:left}.muted{color:#666;font-size:12px}.box{border:1px solid #aaa;padding:12px;margin:12px 0}</style></head><body>
    <h1>Ordem de Serviço ${htmlEscape(order.numero)}</h1>
    <p class="muted">Documento histórico gerado em ${new Date().toLocaleString("pt-BR")}.</p>
    <table><tr><th>Cliente</th><td>${htmlEscape(data.cliente?.nome || order.cliente)}</td><th>CNPJ</th><td>${htmlEscape(data.cliente?.cnpj || order.cnpj)}</td></tr>
    <tr><th>Serviço</th><td>${htmlEscape(servico.nome || order.servico)}</td><th>Contrato</th><td>${htmlEscape(data.os?.contratoId || order.contrato_id)}</td></tr>
    <tr><th>Técnico</th><td>${htmlEscape(data.tecnico?.nome || order.tecnico)}</td><th>Local</th><td>${htmlEscape(operacao.localExecucao || order.local_execucao)}</td></tr>
    <tr><th>Emissão</th><td>${htmlEscape(data.os?.dataEmissao || formatDbDate(order.data_emissao))}</td><th>Execução</th><td>${htmlEscape(data.os?.dataExecucao || formatDbDate(order.data_execucao))}</td></tr></table>
    <div class="box"><strong>POP:</strong> ${htmlEscape([pop.codigo, pop.titulo, pop.versao ? `versão ${pop.versao}` : ""].filter(Boolean).join(" - ") || "-")}</div>
    <h2>Procedimentos</h2>${htmlList(servico.procedimentos || [])}
    <h2>Checklist</h2>${htmlList((operacao.checklistRespostas || servico.checklistItens || []).map((item) => typeof item === "string" ? item : `${item.concluido ? "[X]" : "[ ]"} ${item.item}`))}
    <h2>Evidências</h2><p>${(operacao.evidencias || []).length} evidência(s) vinculada(s).</p>
  </body></html>`;
}

function buildHistoricalMeasurementHtml(snapshot, measurement) {
  const itens = snapshot.itens || [];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(measurement.numero)}</title><style>body{font-family:Arial,sans-serif;padding:28px}h1{color:#065f46}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:7px;text-align:left}.right{text-align:right}</style></head><body>
    <h1>Medição ${htmlEscape(measurement.numero)}</h1>
    <p><strong>Cliente:</strong> ${htmlEscape(snapshot.cliente?.nome || measurement.cliente_nome)}</p>
    <p><strong>Período:</strong> ${htmlEscape(snapshot.periodo?.inicio || measurement.periodo_inicio)} até ${htmlEscape(snapshot.periodo?.fim || measurement.periodo_fim)}</p>
    <table><thead><tr><th>OS</th><th>Serviço</th><th>Data</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>
    ${itens.map((item) => `<tr><td>${htmlEscape(item.osNumero)}</td><td>${htmlEscape(item.servico)}</td><td>${htmlEscape(item.dataExecucao)}</td><td>${htmlEscape(item.quantidade)} ${htmlEscape(item.unidade)}</td><td class="right">${Number(item.valorUnitario || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td class="right">${Number(item.valorTotal || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>`).join("")}
    </tbody><tfoot><tr><th colspan="5" class="right">Total</th><th class="right">${Number(snapshot.total || measurement.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</th></tr></tfoot></table>
  </body></html>`;
}

function buildHistoricalCertificateHtml(snapshot, certificate) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEscape(certificate.numero)}</title><style>body{font-family:Arial,sans-serif;padding:28px}h1{color:#065f46}.box{border:1px solid #999;padding:14px;margin:12px 0}</style></head><body>
    <h1>Certificado ${htmlEscape(certificate.numero)}</h1>
    <div class="box"><strong>Hash:</strong> ${htmlEscape(certificate.hash)}</div>
    <p>Certificamos que <strong>${htmlEscape(snapshot.cliente?.nome || certificate.cliente_nome)}</strong>, CNPJ ${htmlEscape(snapshot.cliente?.cnpj || certificate.cliente_cnpj)}, recebeu o serviço de <strong>${htmlEscape(snapshot.servico?.nome || certificate.servico)}</strong>.</p>
    <p><strong>OS:</strong> ${htmlEscape(snapshot.os?.numero || certificate.os_numero)} | <strong>Data de execução:</strong> ${htmlEscape(snapshot.os?.dataExecucao || certificate.data_execucao)}</p>
    <p><strong>Validade até:</strong> ${htmlEscape(snapshot.certificado?.validadeAte || "")}</p>
  </body></html>`;
}

function formatDbDate(value) {
  return value?.toISOString?.().split("T")[0] ?? value ?? null;
}

function buildServiceSnapshot(service) {
  if (!service) return null;
  return {
    id: service.id,
    nome: service.nome,
    tipo: service.tipo,
    descricao: service.descricao,
    unidade: service.unidade,
    recorrenciaDias: Number(service.recorrencia_dias || 0),
    geraCertificado: Boolean(service.gera_certificado),
    validadeCertificadoDias: Number(service.validade_certificado_dias || 0),
    produtosQuimicos: service.produtos_quimicos || [],
    epis: service.epis || [],
    riscos: service.riscos || [],
    normasAplicaveis: service.normas_aplicaveis || [],
    procedimentos: service.pop_procedimentos || service.procedimentos || [],
    checklistItens: service.pop_checklist_itens || service.checklist_itens || [],
    exigeFoto: Boolean(service.exige_foto),
    exigeAssinatura: Boolean(service.exige_assinatura),
    permiteNaoExecucao: Boolean(service.permite_nao_execucao),
    pop: service.pop_id ? {
      id: service.pop_id,
      codigo: service.pop_codigo,
      titulo: service.pop_titulo,
      versao: service.pop_versao,
      status: service.pop_status,
      objetivo: service.pop_objetivo,
      aplicacao: service.pop_aplicacao,
      responsabilidades: service.pop_responsabilidades || [],
      materiais: service.pop_materiais || [],
      aprovadoPor: service.pop_aprovado_por,
      aprovadoEm: formatDbDate(service.pop_aprovado_em),
    } : {
      codigo: service.pop_codigo || null,
      titulo: service.pop_titulo || null,
      versao: service.pop_versao || null,
    },
  };
}

function buildOrderOperationalSnapshot({ order, customer, contract, service, company, technician, evidences = [], checklistRespostas = [], phase, existing = {} }) {
  const phaseSnapshot = {
    geradoEm: new Date().toISOString(),
    fase: phase,
    os: {
      id: order.id,
      numero: order.numero,
      agendamentoId: order.agendamento_id,
      contratoId: order.contrato_id,
      dataEmissao: formatDbDate(order.data_emissao),
      dataExecucao: formatDbDate(order.data_execucao),
      status: order.status,
      quantidade: Number(order.quantidade || 0),
      unidade: order.unidade,
      naoExecutada: Boolean(order.nao_executada),
      motivoNaoExecucao: order.motivo_nao_execucao || null,
    },
    cliente: {
      id: order.cliente_id || customer?.id || null,
      nome: order.cliente || customer?.razao_social || null,
      cnpj: order.cnpj || customer?.cnpj || null,
      endereco: order.cliente_endereco || (customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : null),
      logoUrl: order.cliente_logo_url || customer?.logo_url || null,
    },
    servico: buildServiceSnapshot(service),
    contrato: contract ? {
      id: contract.id,
      status: contract.status,
      contratado: Number(contract.contratado || 0),
      executado: Number(contract.executado || 0),
      unidade: contract.unidade,
      valorUnitario: Number(contract.valor_unitario || 0),
      validadeDias: Number(contract.validade_dias || 0),
      tags: contract.tags || [],
      locais: contract.locais || [],
    } : null,
    tecnico: {
      nome: order.tecnico || technician?.nome || null,
      cpf: order.tecnico_cpf || technician?.cpf || null,
      cargo: technician?.cargo || null,
      dataAdmissao: formatDbDate(order.tecnico_data_admissao || technician?.data_admissao),
      equipeIds: order.equipe_tecnicos_ids || [],
      equipeNomes: order.equipe_tecnicos_nomes || [],
      veiculoId: order.veiculo_id || null,
      veiculoDescricao: order.veiculo_descricao || null,
    },
    operacao: {
      localExecucao: order.local_execucao || null,
      tags: order.tags || null,
      tagEquipamentoServico: order.tag_equipamento_servico || null,
      observacao: order.observacao || null,
      checklistRespostas,
      evidencias: evidences.map((item) => ({
        id: item.id,
        categoria: item.categoria,
        nomeArquivo: item.nome_arquivo || item.nomeArquivo,
        mimeType: item.mime_type || item.mimeType,
        tamanhoBytes: item.tamanho_bytes || item.tamanhoBytes || null,
        metadados: item.metadados || {},
      })),
    },
    empresa: company ? {
      razaoSocial: company.razao_social,
      nomeFantasia: company.nome_fantasia,
      cnpj: company.cnpj,
      endereco: company.endereco,
      telefone: company.telefone,
      email: company.email,
      responsavelTecnico: company.responsavel_tecnico,
      responsavelExecucao: company.responsavel_execucao,
      cargoResponsavel: company.cargo_responsavel,
    } : null,
  };
  return { ...(existing || {}), [phase]: phaseSnapshot };
}

async function getServiceForSnapshot(client, serviceName) {
  const { rows } = await client.query(
    `SELECT
      s.*,
      p.id AS pop_id,
      p.codigo AS pop_codigo,
      p.titulo AS pop_titulo,
      p.versao AS pop_versao,
      p.status AS pop_status,
      p.objetivo AS pop_objetivo,
      p.aplicacao AS pop_aplicacao,
      p.responsabilidades AS pop_responsabilidades,
      p.materiais AS pop_materiais,
      p.procedimentos AS pop_procedimentos,
      p.checklist_itens AS pop_checklist_itens,
      p.aprovado_por AS pop_aprovado_por,
      p.aprovado_em AS pop_aprovado_em
    FROM ciperprag_hub.servicos_catalogo s
    LEFT JOIN ciperprag_hub.servico_pops p ON p.id = s.pop_ativo_id
    WHERE s.nome = $1
    LIMIT 1`,
    [serviceName],
  );
  return rows[0];
}

function buildCertificateSnapshot({ order, customer, service, company, hash, number, dataExecucao, validadeDias }) {
  const clienteEndereco = customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : order.cliente_endereco;
  const validadeAte = Number(validadeDias || 0) > 0 ? addDays(dataExecucao, Number(validadeDias)) : null;
  const tag = order.tag_equipamento_servico || order.tags || null;
  return {
    certificado: {
      hash,
      numero: number,
      status: "emitido",
      emitidoEm: new Date().toISOString(),
      validadeDias: Number(validadeDias || 0),
      validadeAte,
    },
    cliente: {
      id: order.cliente_id,
      nome: order.cliente,
      cnpj: order.cnpj,
      endereco: clienteEndereco,
      logoUrl: customer?.logo_url || order.cliente_logo_url || null,
    },
    os: {
      id: order.id,
      numero: order.numero,
      contratoId: order.contrato_id,
      dataExecucao,
      quantidade: Number(order.quantidade || 0),
      unidade: order.unidade,
      localExecucao: order.local_execucao,
      tagEquipamentoServico: tag,
      tecnicoNome: order.tecnico,
      fotos: order.fotos || [],
    },
    servico: {
      nome: order.servico,
      tipo: order.tipo,
      geraCertificado: service?.gera_certificado ?? true,
      produtosQuimicos: service?.produtos_quimicos || [],
      produtosDetalhados: service?.produtos_detalhados || [],
      normasAplicaveis: service?.normas_aplicaveis || [],
      popCodigo: service?.pop_codigo || null,
      popTitulo: service?.pop_titulo || null,
      popVersao: service?.pop_versao || null,
    },
    empresa: {
      razaoSocial: company?.razao_social || null,
      nomeFantasia: company?.nome_fantasia || null,
      cnpj: company?.cnpj || null,
      endereco: company?.endereco || null,
      telefone: company?.telefone || null,
      email: company?.email || null,
      alvara: company?.alvara || null,
      cr02: company?.cr02 || null,
      anvisa: company?.anvisa || null,
      vigilanciaSanitaria: company?.vigilancia_sanitaria || null,
      responsavelTecnico: company?.responsavel_tecnico || null,
      responsavelExecucao: company?.responsavel_execucao || null,
      cargoResponsavel: company?.cargo_responsavel || null,
      certificadoTextoLegal: company?.certificado_texto_legal || null,
      certificadoTextoFixacao: company?.certificado_texto_fixacao || null,
      telefoneEmergencia: company?.telefone_emergencia || null,
    },
  };
}

function createTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$%&*+-=?";
  let password = "";
  for (let index = 0; index < 16; index += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

function rowsToClientMap(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        razaoSocial: row.razao_social,
        nomeFantasia: row.nome_fantasia,
        cnpj: row.cnpj,
        inscricaoEstadual: row.inscricao_estadual,
        endereco: row.endereco,
        bairro: row.bairro,
        municipio: row.municipio,
        uf: row.uf,
        cep: row.cep,
        logoUrl: row.logo_url,
        ativo: row.ativo,
        contatos: [],
        locaisExecucao: [],
        equipamentos: [],
      });
    }
    if (row.contato_nome) {
      map.get(row.id).contatos.push({
        nome: row.contato_nome,
        cargo: row.contato_cargo,
        funcao: row.contato_funcao || "operacional",
        telefone: row.contato_telefone,
        email: row.contato_email,
        principal: row.contato_principal,
        observacoes: row.contato_observacoes,
      });
    }
  }
  return [...map.values()];
}

async function getClients() {
  const { rows } = await query(`
    SELECT
      c.*,
      ct.nome AS contato_nome,
      ct.cargo AS contato_cargo,
      ct.funcao AS contato_funcao,
      ct.telefone AS contato_telefone,
      ct.email AS contato_email,
      ct.principal AS contato_principal,
      ct.observacoes AS contato_observacoes
    FROM ciperprag_hub.clientes c
    LEFT JOIN ciperprag_hub.contatos_cliente ct
      ON ct.cliente_id = c.id
    ORDER BY c.id, ct.principal DESC, ct.id
  `);
  const clients = rowsToClientMap(rows);
  const byId = new Map(clients.map((client) => [client.id, client]));

  const { rows: locationRows } = await query("SELECT * FROM ciperprag_hub.cliente_locais_execucao ORDER BY cliente_id, ativo DESC, nome");
  for (const row of locationRows) {
    const client = byId.get(row.cliente_id);
    if (!client) continue;
    client.locaisExecucao.push({
      id: row.id,
      clienteId: row.cliente_id,
      nome: row.nome,
      endereco: row.endereco,
      bairro: row.bairro,
      municipio: row.municipio,
      uf: row.uf,
      cep: row.cep,
      observacoes: row.observacoes,
      ativo: row.ativo,
    });
  }

  const { rows: equipmentRows } = await query("SELECT * FROM ciperprag_hub.cliente_equipamentos ORDER BY cliente_id, ativo DESC, tag");
  for (const row of equipmentRows) {
    const client = byId.get(row.cliente_id);
    if (!client) continue;
    client.equipamentos.push({
      id: row.id,
      clienteId: row.cliente_id,
      localId: row.local_id,
      tag: row.tag,
      descricao: row.descricao,
      tipo: row.tipo,
      setor: row.setor,
      observacoes: row.observacoes,
      ativo: row.ativo,
    });
  }

  return clients;
}

async function getServices() {
  const { rows } = await query(`
    SELECT
      s.*,
      p.id AS active_pop_id,
      p.codigo AS active_pop_codigo,
      p.titulo AS active_pop_titulo,
      p.versao AS active_pop_versao,
      p.status AS active_pop_status,
      p.objetivo AS active_pop_objetivo,
      p.aplicacao AS active_pop_aplicacao,
      p.responsabilidades AS active_pop_responsabilidades,
      p.materiais AS active_pop_materiais,
      p.procedimentos AS active_pop_procedimentos,
      p.checklist_itens AS active_pop_checklist_itens,
      p.aprovado_por AS active_pop_aprovado_por,
      p.aprovado_em AS active_pop_aprovado_em
    FROM ciperprag_hub.servicos_catalogo s
    LEFT JOIN ciperprag_hub.servico_pops p ON p.id = s.pop_ativo_id
    ORDER BY s.id
  `);
  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    descricao: row.descricao,
    unidade: row.unidade,
    recorrenciaDias: row.recorrencia_dias,
    geraCertificado: row.gera_certificado,
    validadeCertificadoDias: row.validade_certificado_dias,
    produtosQuimicos: row.produtos_quimicos ?? [],
    epis: row.epis ?? [],
    riscos: row.riscos ?? [],
    normasAplicaveis: row.normas_aplicaveis ?? [],
    procedimentos: row.active_pop_procedimentos ?? row.procedimentos ?? [],
    checklistItens: row.active_pop_checklist_itens ?? row.checklist_itens ?? [],
    exigeFoto: row.exige_foto,
    exigeAssinatura: row.exige_assinatura,
    permiteNaoExecucao: row.permite_nao_execucao,
    popId: row.active_pop_id,
    popCodigo: row.active_pop_codigo ?? row.pop_codigo,
    popTitulo: row.active_pop_titulo ?? row.pop_titulo,
    popVersao: row.active_pop_versao ?? row.pop_versao,
    popStatus: row.active_pop_status,
    popObjetivo: row.active_pop_objetivo,
    popAplicacao: row.active_pop_aplicacao,
    popResponsabilidades: row.active_pop_responsabilidades ?? [],
    popMateriais: row.active_pop_materiais ?? [],
    popAprovadoPor: row.active_pop_aprovado_por,
    popAprovadoEm: row.active_pop_aprovado_em?.toISOString?.().split("T")[0] ?? row.active_pop_aprovado_em,
    ativo: row.ativo,
  }));
}

async function getContracts() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.contratos ORDER BY id");
  return rows.map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    cliente: row.cliente,
    cnpj: row.cnpj,
    servico: row.servico,
    tipo: row.tipo,
    contratado: Number(row.contratado),
    executado: Number(row.executado),
    unidade: row.unidade,
    status: row.status,
    ultimaExecucao: row.ultima_execucao?.toISOString?.().split("T")[0] ?? row.ultima_execucao,
    validadeDias: row.validade_dias,
    valorUnitario: Number(row.valor_unitario ?? 0),
    tags: row.tags ?? [],
    produtosQuimicos: row.produtos_quimicos ?? [],
    epis: row.epis ?? [],
    riscos: row.riscos ?? [],
    locais: row.locais ?? [],
  }));
}

async function getSchedules() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.agendamentos ORDER BY created_at, id");
  return rows.map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    clienteNome: row.cliente,
    clienteCnpj: row.cliente_cnpj,
    contratoId: row.contrato_id,
    servico: row.servico,
    tipo: row.tipo,
    dataAgendada: row.data_agendada?.toISOString?.().split("T")[0] ?? row.data_agendada,
    localExecucao: row.local_execucao,
    tags: row.tags,
    observacao: row.observacao,
    tecnicosIds: row.tecnicos_ids ?? [],
    tecnicosNomes: row.tecnicos_nomes ?? [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    status: row.status,
    osId: row.os_id,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  }));
}

function mapAttachment(row, options = {}) {
  const includeContent = options.includeContent || (options.includeImageContent && row.mime_type?.startsWith("image/"));
  return {
    id: row.id,
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id,
    categoria: row.categoria,
    nomeArquivo: row.nome_arquivo,
    mimeType: row.mime_type,
    tamanhoBytes: row.tamanho_bytes,
    conteudoBase64: includeContent ? row.conteudo_base64 : undefined,
    downloadUrl: `/api/attachments/${encodeURIComponent(row.id)}/download`,
    url: row.url,
    metadados: row.metadados ?? {},
    hashSha256: row.hash_sha256,
    imutavel: row.imutavel,
    criadoEm: row.criado_em?.toISOString?.() ?? row.criado_em,
  };
}

async function getAttachments() {
  const { rows } = await query(
    `SELECT id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, url, metadados, hash_sha256, imutavel, criado_em
     FROM ciperprag_hub.evidencias_anexos
     ORDER BY criado_em DESC, id DESC`,
  );
  return rows.map((row) => mapAttachment(row));
}

async function getAttachmentsByEntity(entityType) {
  const { rows } = await query(
    `SELECT *
     FROM ciperprag_hub.evidencias_anexos
     WHERE entidade_tipo = $1
     ORDER BY entidade_id, criado_em, id`,
    [entityType],
  );
  const map = new Map();
  for (const row of rows) {
    const item = mapAttachment(row, { includeImageContent: true });
    if (!map.has(row.entidade_id)) map.set(row.entidade_id, []);
    map.get(row.entidade_id).push(item);
  }
  return map;
}

async function getOrders() {
  const attachmentsByOrder = await getAttachmentsByEntity("os");
  const { rows } = await query("SELECT * FROM ciperprag_hub.ordens_servico ORDER BY data_emissao, id");
  return rows.map((row) => ({
    id: row.id,
    numero: row.numero,
    agendamentoId: row.agendamento_id,
    clienteId: row.cliente_id,
    clienteNome: row.cliente,
    clienteCnpj: row.cnpj,
    clienteEndereco: row.cliente_endereco,
    clienteLogoUrl: row.cliente_logo_url,
    contratoId: row.contrato_id,
    servico: row.servico,
    tipo: row.tipo,
    tecnicoNome: row.tecnico,
    tecnicoCpf: row.tecnico_cpf,
    tecnicoDataAdmissao: row.tecnico_data_admissao?.toISOString?.().split("T")[0] ?? row.tecnico_data_admissao,
    equipeTecnicosIds: row.equipe_tecnicos_ids ?? [],
    equipeTecnicosNomes: row.equipe_tecnicos_nomes ?? [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    localExecucao: row.local_execucao,
    tags: row.tags,
    tagEquipamentoServico: row.tag_equipamento_servico,
    observacao: row.observacao,
    dataEmissao: row.data_emissao?.toISOString?.().split("T")[0] ?? row.data_emissao,
    dataExecucao: row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao,
    quantidade: Number(row.quantidade ?? 0),
    unidade: row.unidade,
    status: row.status,
    fotos: row.fotos ?? [],
    evidencias: attachmentsByOrder.get(row.id) ?? [],
    certificadoHash: row.certificado_hash,
    checklistRespostas: row.checklist_respostas ?? [],
    naoExecutada: row.nao_executada ?? false,
    motivoNaoExecucao: row.motivo_nao_execucao,
    snapshotDados: row.snapshot_dados ?? {},
  }));
}

async function getCertificates() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.certificados ORDER BY emitido_em DESC, id DESC");
  return rows.map((row) => ({
    id: row.id,
    hash: row.hash,
    numero: row.numero,
    osId: row.os_id,
    osNumero: row.os_numero,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    clienteEndereco: row.cliente_endereco,
    clienteLogoUrl: row.cliente_logo_url,
    contratoId: row.contrato_id,
    servico: row.servico,
    tecnicoNome: row.tecnico_nome,
    localExecucao: row.local_execucao,
    dataExecucao: row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao,
    emitidoEm: row.emitido_em?.toISOString?.() ?? row.emitido_em,
    validadeDias: row.validade_dias,
    produtosQuimicos: row.produtos_quimicos ?? [],
    produtosDetalhados: row.produtos_detalhados ?? [],
    snapshotDados: row.snapshot_dados ?? {},
    status: row.status,
    revogadoEm: row.revogado_em?.toISOString?.() ?? row.revogado_em,
    motivoRevogacao: row.motivo_revogacao,
  }));
}

async function getCertificateByHash(hash) {
  const normalizedHash = String(hash || "").trim().toUpperCase();
  if (!normalizedHash) return null;
  const { rows } = await query(
    `SELECT
      c.*,
      o.tag_equipamento_servico,
      o.quantidade,
      o.unidade,
      o.fotos
     FROM ciperprag_hub.certificados c
     LEFT JOIN ciperprag_hub.ordens_servico o
       ON o.id = c.os_id
     WHERE UPPER(c.hash) = $1
     LIMIT 1`,
    [normalizedHash],
  );
  const row = rows[0];
  if (!row) return null;
  const validadeAte = Number(row.validade_dias || 0) > 0 ? addDays(row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao, Number(row.validade_dias)) : null;
  return {
    id: row.id,
    hash: row.hash,
    numero: row.numero,
    osId: row.os_id,
    osNumero: row.os_numero,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    clienteEndereco: row.cliente_endereco,
    clienteLogoUrl: row.cliente_logo_url,
    contratoId: row.contrato_id,
    servico: row.servico,
    tecnicoNome: row.tecnico_nome,
    localExecucao: row.local_execucao,
    dataExecucao: row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao,
    emitidoEm: row.emitido_em?.toISOString?.() ?? row.emitido_em,
    validadeDias: Number(row.validade_dias || 0),
    validadeAte,
    status: row.status === "revogado" ? "expired" : buildCertificateStatus(row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao, Number(row.validade_dias || 0)),
    certificateStatus: row.status,
    revogadoEm: row.revogado_em?.toISOString?.() ?? row.revogado_em,
    motivoRevogacao: row.motivo_revogacao,
    produtosQuimicos: row.produtos_quimicos ?? [],
    produtosDetalhados: row.produtos_detalhados ?? [],
    snapshotDados: row.snapshot_dados ?? {},
    tagEquipamentoServico: row.tag_equipamento_servico,
    quantidade: Number(row.quantidade || 0),
    unidade: row.unidade,
    fotos: row.fotos ?? [],
  };
}

async function issueCertificateForOrder(client, order, { dataExecucao } = {}) {
  const { rows: serviceRows } = await client.query("SELECT * FROM ciperprag_hub.servicos_catalogo WHERE nome = $1", [order.servico]);
  const service = serviceRows[0];
  const { rows: customerRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1", [order.cliente_id]);
  const customer = customerRows[0];
  const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config ORDER BY id LIMIT 1");
  const company = companyRows[0];
  const { rows: numRows } = await client.query(
    `UPDATE ciperprag_hub.numeracao_config
     SET certificado_ultimo = certificado_ultimo + 1, atualizado_em = NOW()
     WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config ORDER BY id LIMIT 1)
     RETURNING certificado_formato, certificado_ultimo`,
  );

  const certId = makeId("CERT");
  const hash = order.certificado_hash || await generateUniqueCertificateHash(client);
  const certNumber = formatSequential(numRows[0]?.certificado_formato, numRows[0]?.certificado_ultimo || 1);
  const executionDate = dataExecucao || order.data_execucao?.toISOString?.().split("T")[0] || order.data_execucao || order.data_emissao?.toISOString?.().split("T")[0] || order.data_emissao;
  const validadeDias = Number(service?.validade_certificado_dias || company?.certificado_validade_padrao_dias || 0);
  const clienteEndereco = customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : order.cliente_endereco;
  const snapshot = buildCertificateSnapshot({ order, customer, service, company, hash, number: certNumber, dataExecucao: executionDate, validadeDias });

  const insertResult = await client.query(
    `INSERT INTO ciperprag_hub.certificados
     (id, hash, numero, os_id, os_numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, cliente_logo_url, contrato_id, servico, tecnico_nome, local_execucao, data_execucao, emitido_em, validade_dias, produtos_quimicos, produtos_detalhados, snapshot_dados, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),$16,$17,$18,$19,'emitido')
     ON CONFLICT (hash) DO NOTHING`,
    [
      certId,
      hash,
      certNumber,
      order.id,
      order.numero,
      order.cliente_id,
      order.cliente,
      order.cnpj,
      clienteEndereco,
      customer?.logo_url || order.cliente_logo_url || null,
      order.contrato_id,
      order.servico,
      order.tecnico,
      order.local_execucao,
      executionDate,
      validadeDias,
      service?.produtos_quimicos || [],
      service?.produtos_detalhados || [],
      JSON.stringify(snapshot),
    ],
  );
  if (insertResult.rowCount > 0) {
    await saveImmutableDocumentAttachment(client, {
      tenantId: order.tenant_id || customer?.tenant_id || null,
      userId: null,
      entityType: "certificado",
      entityId: certId,
      fileName: `certificado-${certNumber.replaceAll("/", "-")}.html`,
      html: buildHistoricalCertificateHtml(snapshot, { ...order, id: certId, hash, numero: certNumber, os_numero: order.numero }),
      metadata: { origem: "emissao_certificado", certificadoHash: hash, osId: order.id },
    });
  }
  await client.query("UPDATE ciperprag_hub.ordens_servico SET certificado_hash = $2 WHERE id = $1", [order.id, hash]);
  return hash;
}

async function getCompanyConfig() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.empresa_config ORDER BY id LIMIT 1");
  const row = rows[0];
  if (!row) return null;
  return {
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia,
    cnpj: row.cnpj,
    endereco: row.endereco,
    telefone: row.telefone,
    email: row.email,
    logoUrl: row.logo_url,
    alvara: row.alvara,
    cr02: row.cr02,
    anvisa: row.anvisa,
    vigilanciaSanitaria: row.vigilancia_sanitaria,
    responsavelTecnico: row.responsavel_tecnico,
    responsavelExecucao: row.responsavel_execucao,
    cargoResponsavel: row.cargo_responsavel,
    certificadoValidadePadraoDias: row.certificado_validade_padrao_dias,
    certificadoTextoLegal: row.certificado_texto_legal,
    certificadoTextoFixacao: row.certificado_texto_fixacao,
    telefoneEmergencia: row.telefone_emergencia,
    medicaoFormaPagamentoPadrao: row.medicao_forma_pagamento_padrao,
    medicaoLocalEntregaPadrao: row.medicao_local_entrega_padrao,
  };
}

async function getNumberingConfig() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.numeracao_config ORDER BY id LIMIT 1");
  const row = rows[0];
  if (!row) return null;
  return {
    propostaFormato: row.proposta_formato,
    propostaUltimo: row.proposta_ultimo,
    contratoFormato: row.contrato_formato,
    contratoUltimo: row.contrato_ultimo,
    osFormato: row.os_formato,
    osUltimo: row.os_ultimo,
    certificadoFormato: row.certificado_formato,
    certificadoUltimo: row.certificado_ultimo,
    medicaoFormato: row.medicao_formato,
    medicaoUltimo: row.medicao_ultimo,
  };
}

async function getTechnicians() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.tecnicos ORDER BY id");
  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    cargo: row.cargo,
    dataAdmissao: row.data_admissao?.toISOString?.().split("T")[0] ?? row.data_admissao,
    telefone: row.telefone,
    ativo: row.ativo,
  }));
}

async function getVehicles() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.veiculos ORDER BY id");
  return rows.map((row) => ({
    id: row.id,
    placa: row.placa,
    modelo: row.modelo,
    ano: row.ano,
    ativo: row.ativo,
  }));
}

async function getAllocations() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.alocacoes_semanais ORDER BY id");
  return rows.map((row) => ({
    id: row.id,
    tecnicoId: row.tecnico_id,
    veiculoId: row.veiculo_id,
    diaSemana: row.dia_semana,
    cliente: row.cliente,
    servico: row.servico,
    turno: row.turno,
  }));
}

async function getContractTemplates() {
  const { rows } = await query(`
    SELECT
      t.*,
      s.servico_id,
      s.quantidade,
      s.valor_unitario,
      s.frequencia
    FROM ciperprag_hub.contratos_templates t
    LEFT JOIN ciperprag_hub.contratos_templates_servicos s
      ON s.template_id = t.id
    ORDER BY t.id, s.id
  `);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        numero: row.numero,
        clienteId: row.cliente_id,
        tipo: row.tipo,
        servicos: [],
        vigenciaMeses: row.vigencia_meses,
        formaPagamento: row.forma_pagamento,
        prazoPagamentoDias: row.prazo_pagamento_dias,
        status: row.status,
        dataCriacao: row.data_criacao?.toISOString?.().split("T")[0] ?? row.data_criacao,
        observacoes: row.observacoes,
      });
    }
    if (row.servico_id) {
      map.get(row.id).servicos.push({
        servicoId: row.servico_id,
        quantidade: Number(row.quantidade),
        valorUnitario: Number(row.valor_unitario),
        frequencia: row.frequencia,
      });
    }
  }
  return [...map.values()];
}

async function getRecurrenceSuggestions() {
  const { rows } = await query("SELECT * FROM ciperprag_hub.recorrencia_sugestoes ORDER BY created_at DESC");
  return rows.map((row) => ({
    id: row.id,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    contratoId: row.contrato_id,
    servico: row.servico,
    tipo: row.tipo,
    localExecucao: row.local_execucao,
    tags: row.tags,
    observacao: row.observacao,
    tecnicosIds: row.tecnicos_ids ?? [],
    tecnicosNomes: row.tecnicos_nomes ?? [],
    veiculoId: row.veiculo_id,
    veiculoDescricao: row.veiculo_descricao,
    suggestedDate: row.suggested_date?.toISOString?.().split("T")[0] ?? row.suggested_date,
    sourceAgendamentoId: row.source_agendamento_id,
    sourceOsId: row.source_os_id,
    status: row.status,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
  }));
}

async function getMeasurements() {
  const { rows } = await query(`
    SELECT
      m.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', i.id,
            'osId', i.os_id,
            'osNumero', i.os_numero,
            'contratoId', i.contrato_id,
            'servico', i.servico,
            'dataExecucao', i.data_execucao,
            'quantidade', i.quantidade,
            'unidade', i.unidade,
            'valorUnitario', i.valor_unitario,
            'valorTotal', i.valor_total
          )
          ORDER BY i.data_execucao, i.os_numero
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'
      ) AS itens
    FROM ciperprag_hub.medicoes m
    LEFT JOIN ciperprag_hub.medicao_itens i ON i.medicao_id = m.id
    GROUP BY m.id
    ORDER BY m.criado_em DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    numero: row.numero,
    clienteId: row.cliente_id,
    clienteNome: row.cliente_nome,
    clienteCnpj: row.cliente_cnpj,
    clienteEndereco: row.cliente_endereco,
    periodoInicio: row.periodo_inicio?.toISOString?.().split("T")[0] ?? row.periodo_inicio,
    periodoFim: row.periodo_fim?.toISOString?.().split("T")[0] ?? row.periodo_fim,
    status: row.status,
    total: Number(row.total || 0),
    formaPagamento: row.forma_pagamento,
    localEntrega: row.local_entrega,
    snapshotDados: row.snapshot_dados ?? {},
    criadoEm: row.criado_em?.toISOString?.() ?? row.criado_em,
    itens: (row.itens ?? []).map((item) => ({
      ...item,
      dataExecucao: item.dataExecucao?.toISOString?.().split("T")[0] ?? item.dataExecucao,
      quantidade: Number(item.quantidade || 0),
      valorUnitario: Number(item.valorUnitario || 0),
      valorTotal: Number(item.valorTotal || 0),
    })),
  }));
}

async function getRolesForTenant(tenantId) {
  const { rows } = await query(
    `SELECT
       p.id,
       p.codigo,
       p.nome,
       p.descricao,
       p.sistema,
       COALESCE(
         ARRAY_AGG(DISTINCT perm.codigo) FILTER (WHERE perm.codigo IS NOT NULL),
         '{}'
       ) AS permissoes
     FROM ciperprag_hub.perfis p
     LEFT JOIN ciperprag_hub.perfil_permissoes pp ON pp.perfil_id = p.id
     LEFT JOIN ciperprag_hub.permissoes perm ON perm.id = pp.permissao_id
     WHERE p.tenant_id = $1
     GROUP BY p.id
     ORDER BY p.sistema DESC, p.nome`,
    [tenantId],
  );

  return rows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nome: row.nome,
    descricao: row.descricao,
    sistema: row.sistema,
    permissoes: row.permissoes ?? [],
  }));
}

async function getUsersForTenant(tenantId) {
  const { rows } = await query(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.status,
       u.ultimo_login_em,
       u.created_at,
       u.updated_at,
       COALESCE(
         JSON_AGG(DISTINCT JSONB_BUILD_OBJECT('codigo', p.codigo, 'nome', p.nome))
           FILTER (WHERE p.id IS NOT NULL),
         '[]'
       ) AS perfis
     FROM ciperprag_hub.usuarios u
     LEFT JOIN ciperprag_hub.usuario_perfis up ON up.usuario_id = u.id
     LEFT JOIN ciperprag_hub.perfis p ON p.id = up.perfil_id
     WHERE u.tenant_id = $1
     GROUP BY u.id
     ORDER BY u.nome`,
    [tenantId],
  );

  return rows.map((row) => ({
    id: row.id,
    nome: row.nome,
    email: row.email,
    status: row.status,
    ultimoLoginEm: row.ultimo_login_em?.toISOString?.() ?? row.ultimo_login_em,
    criadoEm: row.created_at?.toISOString?.() ?? row.created_at,
    atualizadoEm: row.updated_at?.toISOString?.() ?? row.updated_at,
    perfis: row.perfis ?? [],
  }));
}

async function getAuditLogsForTenant(tenantId, filters = {}) {
  const limit = Math.min(Math.max(Number(filters.limit || 150), 1), 500);
  const where = ["l.tenant_id = $1"];
  const params = [tenantId];

  if (filters.entityType && filters.entityType !== "todos") {
    params.push(filters.entityType);
    where.push(`l.entidade_tipo = $${params.length}`);
  }
  if (filters.action && filters.action !== "todas") {
    params.push(filters.action);
    where.push(`l.acao = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${String(filters.search).trim()}%`);
    where.push(`(l.resumo ILIKE $${params.length} OR l.entidade_id ILIKE $${params.length} OR l.acao ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.nome ILIKE $${params.length})`);
  }

  params.push(limit);
  const { rows } = await query(
    `SELECT
       l.id,
       l.entidade_tipo,
       l.entidade_id,
       l.acao,
       l.resumo,
       l.dados_antes,
       l.dados_depois,
       l.ip::text AS ip,
       l.user_agent,
       l.created_at,
       u.nome AS usuario_nome,
       u.email AS usuario_email
     FROM ciperprag_hub.audit_logs l
     LEFT JOIN ciperprag_hub.usuarios u ON u.id = l.usuario_id
     WHERE ${where.join(" AND ")}
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT $${params.length}`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id,
    acao: row.acao,
    resumo: row.resumo,
    dadosAntes: row.dados_antes,
    dadosDepois: row.dados_depois,
    ip: row.ip,
    userAgent: row.user_agent,
    criadoEm: row.created_at?.toISOString?.() ?? row.created_at,
    usuario: row.usuario_email
      ? {
          nome: row.usuario_nome,
          email: row.usuario_email,
        }
      : null,
  }));
}

async function getBootstrap() {
  const [companyConfig, numberingConfig, clients, services, contracts, schedules, orders, certificates, technicians, vehicles, allocations, contractTemplates, recurrenceSuggestions, measurements, attachments] =
    await Promise.all([
      getCompanyConfig(),
      getNumberingConfig(),
      getClients(),
      getServices(),
      getContracts(),
      getSchedules(),
      getOrders(),
      getCertificates(),
      getTechnicians(),
      getVehicles(),
      getAllocations(),
      getContractTemplates(),
      getRecurrenceSuggestions(),
      getMeasurements(),
      getAttachments(),
    ]);

  return {
    companyConfig,
    numberingConfig,
    clients,
    services,
    contracts,
    schedules,
    orders,
    certificates,
    technicians,
    vehicles,
    allocations,
    contractTemplates,
    recurrenceSuggestions,
    measurements,
    attachments,
  };
}

async function nextSequential(field) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config
       SET ${field} = ${field} + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config ORDER BY id LIMIT 1)
       RETURNING ${field} AS value`,
    );
    return rows[0].value;
  });
}

async function upsertSchedule(body) {
  const id = body.id || makeId("AG");
  await query(
    `INSERT INTO ciperprag_hub.agendamentos
    (id, contrato_id, cliente_id, cliente, cliente_cnpj, servico, tipo, data_agendada, local_execucao, tags, observacao, tecnicos_ids, tecnicos_nomes, veiculo_id, veiculo_descricao, status, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,COALESCE($17, NOW()))
    ON CONFLICT (id) DO UPDATE SET
      contrato_id=EXCLUDED.contrato_id,
      cliente_id=EXCLUDED.cliente_id,
      cliente=EXCLUDED.cliente,
      cliente_cnpj=EXCLUDED.cliente_cnpj,
      servico=EXCLUDED.servico,
      tipo=EXCLUDED.tipo,
      data_agendada=EXCLUDED.data_agendada,
      local_execucao=EXCLUDED.local_execucao,
      tags=EXCLUDED.tags,
      observacao=EXCLUDED.observacao,
      tecnicos_ids=EXCLUDED.tecnicos_ids,
      tecnicos_nomes=EXCLUDED.tecnicos_nomes,
      veiculo_id=EXCLUDED.veiculo_id,
      veiculo_descricao=EXCLUDED.veiculo_descricao,
      status=EXCLUDED.status`,
    [
      id,
      body.contratoId,
      body.clienteId || null,
      body.clienteNome,
      body.clienteCnpj,
      body.servico,
      body.tipo,
      body.dataAgendada,
      body.localExecucao,
      body.tags || null,
      body.observacao || null,
      body.tecnicosIds || [],
      body.tecnicosNomes || [],
      body.veiculoId || null,
      body.veiculoDescricao || null,
      body.status || "agendado",
      body.createdAt || null,
    ],
  );
  return id;
}

app.get("/api/health", async (_req, res) => {
  await query("SELECT 1");
  res.json({ ok: true });
});

app.get("/api/certificates/:hash", async (req, res) => {
  const certificate = await getCertificateByHash(req.params.hash);
  if (!certificate) return res.status(404).json({ error: "Certificado nao encontrado" });
  res.json({ ok: true, certificate, verifiedAt: new Date().toISOString() });
});

app.post("/api/auth/login", async (req, res) => {
  const result = await loginWithPassword({
    email: req.body.email,
    password: req.body.password,
    ip: getRequestIp(req),
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true, ...result });
});

app.use("/api", requireAuth);

app.get("/api/auth/me", async (req, res) => {
  res.json({ ok: true, user: req.auth.user });
});

app.post("/api/auth/logout", async (req, res) => {
  await logAuditEvent(null, req, {
    entityType: "usuario",
    entityId: req.auth.user.id,
    action: "logout",
    summary: "Logout realizado",
  });
  await revokeSession(req.auth.tokenHash);
  res.json({ ok: true });
});

app.post("/api/auth/change-password", async (req, res) => {
  const user = await changePassword({
    userId: req.auth.user.id,
    tenantId: req.auth.user.tenant.id,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
    sessionTokenHash: req.auth.tokenHash,
    ip: getRequestIp(req),
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true, user });
});

app.get("/api/bootstrap", async (_req, res) => {
  if (_req.auth?.user?.senhaTemporaria) return res.status(428).json({ error: "Troca de senha obrigatoria antes de continuar." });
  res.json(await getBootstrap());
});

app.get("/api/audit-logs", requirePermission("auditoria.view"), async (req, res) => {
  const logs = await getAuditLogsForTenant(req.auth.user.tenant.id, {
    entityType: req.query.entityType,
    action: req.query.action,
    search: req.query.search,
    limit: req.query.limit,
  });
  res.json({ ok: true, logs });
});

app.get("/api/attachments/:id/download", async (req, res) => {
  if (req.auth?.user?.senhaTemporaria) return res.status(428).json({ error: "Troca de senha obrigatoria antes de continuar." });
  const { rows } = await query("SELECT * FROM ciperprag_hub.evidencias_anexos WHERE id = $1 LIMIT 1", [req.params.id]);
  const attachment = rows[0];
  if (!attachment) return res.status(404).json({ error: "Anexo nao encontrado." });

  const requiredPermission = attachmentPermissionFor(attachment.entidade_tipo);
  const granted = new Set(req.auth?.user?.permissoes || []);
  if (!granted.has(requiredPermission)) return res.status(403).json({ error: "Usuario sem permissao para acessar este anexo." });
  if (!attachment.conteudo_base64 && !attachment.url) return res.status(404).json({ error: "Conteudo do anexo nao encontrado." });
  await logAuditEvent(null, req, {
    entityType: "anexo",
    entityId: attachment.id,
    action: req.query.download === "1" ? "attachment_download" : "attachment_view",
    summary: `${req.query.download === "1" ? "Download" : "Visualizacao"} do anexo ${attachment.nome_arquivo}`,
    after: {
      entidadeTipo: attachment.entidade_tipo,
      entidadeId: attachment.entidade_id,
      categoria: attachment.categoria,
      nomeArquivo: attachment.nome_arquivo,
      hashSha256: attachment.hash_sha256,
    },
  });
  if (attachment.url && !attachment.conteudo_base64) return res.redirect(attachment.url);

  const decoded = decodeStoredAttachmentContent(attachment.conteudo_base64);
  const mimeType = attachment.mime_type || decoded.mimeType || "application/octet-stream";
  const dispositionType = req.query.download === "1" ? "attachment" : "inline";
  const fileName = String(attachment.nome_arquivo || `${attachment.id}.bin`).replaceAll('"', "");

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", decoded.buffer.length);
  res.setHeader("Content-Disposition", `${dispositionType}; filename="${encodeURIComponent(fileName)}"`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (attachment.hash_sha256) res.setHeader("X-Document-Hash-Sha256", attachment.hash_sha256);
  res.send(decoded.buffer);
});

app.get("/api/roles", requirePermission("usuarios.manage"), async (req, res) => {
  res.json({ ok: true, roles: await getRolesForTenant(req.auth.user.tenant.id) });
});

app.get("/api/users", requirePermission("usuarios.manage"), async (req, res) => {
  res.json({ ok: true, users: await getUsersForTenant(req.auth.user.tenant.id) });
});

app.post("/api/users", requirePermission("usuarios.manage"), async (req, res) => {
  const body = req.body;
  const tenantId = req.auth.user.tenant.id;
  const email = normalizeEmail(body.email);
  const status = body.status || "ativo";
  const roleCodes = Array.isArray(body.perfilCodigos) ? body.perfilCodigos : [];

  if (!String(body.nome || "").trim()) return res.status(400).json({ error: "Nome obrigatorio." });
  if (!email) return res.status(400).json({ error: "E-mail obrigatorio." });
  if (!["ativo", "convidado", "bloqueado", "inativo"].includes(status)) return res.status(400).json({ error: "Status invalido." });
  if (roleCodes.length === 0) return res.status(400).json({ error: "Selecione pelo menos um perfil." });
  if (body.id === req.auth.user.id && status !== "ativo") return res.status(400).json({ error: "Voce nao pode bloquear ou inativar seu proprio usuario." });

  const temporaryPassword = body.id ? null : createTemporaryPassword();
  const passwordHash = temporaryPassword ? await hashPassword(temporaryPassword) : null;

  const user = await withTransaction(async (client) => {
    const { rows: roleRows } = await client.query(
      `SELECT id, codigo
       FROM ciperprag_hub.perfis
       WHERE tenant_id = $1 AND codigo = ANY($2::text[])`,
      [tenantId, roleCodes],
    );
    if (roleRows.length !== roleCodes.length) {
      const error = new Error("Um ou mais perfis informados nao existem.");
      error.status = 400;
      throw error;
    }

    const { rows } = body.id
      ? await client.query(
          `UPDATE ciperprag_hub.usuarios
           SET nome = $3,
               email = $4,
               status = $5,
               updated_at = NOW()
           WHERE id = $1 AND tenant_id = $2
           RETURNING id, nome, email, status`,
          [body.id, tenantId, String(body.nome).trim(), email, status],
        )
      : await client.query(
          `INSERT INTO ciperprag_hub.usuarios
           (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria)
           VALUES ($1,$2,$3,$4,$5,NOW(),TRUE)
           RETURNING id, nome, email, status`,
          [tenantId, String(body.nome).trim(), email, passwordHash, status],
        );

    const savedUser = rows[0];
    if (!savedUser) {
      const error = new Error("Usuario nao encontrado.");
      error.status = 404;
      throw error;
    }

    await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [savedUser.id]);
    for (const role of roleRows) {
      await client.query(
        `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [savedUser.id, role.id],
      );
    }

    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
       VALUES ($1,$2,'usuario',$3,$4,$5)`,
      [
        tenantId,
        req.auth.user.id,
        savedUser.id,
        body.id ? "user_updated" : "user_created",
        body.id ? `Usuario ${savedUser.email} atualizado` : `Usuario ${savedUser.email} criado`,
      ],
    );

    return savedUser;
  });

  res.json({ ok: true, user, temporaryPassword });
});

app.post("/api/users/:id/reset-password", requirePermission("usuarios.manage"), async (req, res) => {
  const tenantId = req.auth.user.tenant.id;
  const userId = req.params.id;
  const temporaryPassword = createTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const { rowCount } = await query(
    `UPDATE ciperprag_hub.usuarios
     SET senha_hash = $3,
         senha_temporaria = TRUE,
         senha_alterada_em = NOW(),
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [userId, tenantId, passwordHash],
  );
  if (!rowCount) return res.status(404).json({ error: "Usuario nao encontrado." });

  await query(
    `UPDATE ciperprag_hub.usuario_sessoes
     SET revoked_at = NOW()
     WHERE usuario_id = $1 AND revoked_at IS NULL`,
    [userId],
  );

  await query(
    `INSERT INTO ciperprag_hub.audit_logs
     (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
     VALUES ($1,$2,'usuario',$3,'password_reset','Senha temporaria gerada')`,
    [tenantId, req.auth.user.id, userId],
  );

  res.json({ ok: true, temporaryPassword });
});

app.post("/api/clients", requirePermission("clientes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `CLI-${String(Date.now()).slice(-6)}`;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ciperprag_hub.clientes (id, razao_social, nome_fantasia, cnpj, inscricao_estadual, endereco, bairro, municipio, uf, cep, logo_url, ativo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         razao_social = EXCLUDED.razao_social,
         nome_fantasia = EXCLUDED.nome_fantasia,
         cnpj = EXCLUDED.cnpj,
         inscricao_estadual = EXCLUDED.inscricao_estadual,
         endereco = EXCLUDED.endereco,
         bairro = EXCLUDED.bairro,
         municipio = EXCLUDED.municipio,
         uf = EXCLUDED.uf,
         cep = EXCLUDED.cep,
         logo_url = EXCLUDED.logo_url,
         ativo = EXCLUDED.ativo,
         atualizado_em = NOW()`,
      [id, body.razaoSocial, body.nomeFantasia, body.cnpj, body.inscricaoEstadual, body.endereco, body.bairro, body.municipio, body.uf, body.cep, body.logoUrl || null, body.ativo],
    );
    await client.query("DELETE FROM ciperprag_hub.contatos_cliente WHERE cliente_id = $1", [id]);
    for (const contato of body.contatos || []) {
      await client.query(
        `INSERT INTO ciperprag_hub.contatos_cliente (cliente_id, nome, cargo, funcao, telefone, email, principal, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, contato.nome, contato.cargo, contato.funcao || "operacional", contato.telefone, contato.email, contato.principal, contato.observacoes || null],
      );
    }

    await client.query("DELETE FROM ciperprag_hub.cliente_equipamentos WHERE cliente_id = $1", [id]);
    await client.query("DELETE FROM ciperprag_hub.cliente_locais_execucao WHERE cliente_id = $1", [id]);

    const savedLocationIds = new Set();
    for (const local of body.locaisExecucao || []) {
      const localId = local.id || makeId("LOC");
      savedLocationIds.add(localId);
      await client.query(
        `INSERT INTO ciperprag_hub.cliente_locais_execucao
         (id, tenant_id, cliente_id, nome, endereco, bairro, municipio, uf, cep, observacoes, ativo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [localId, req.auth.user.tenant.id, id, local.nome, local.endereco || null, local.bairro || null, local.municipio || null, local.uf || null, local.cep || null, local.observacoes || null, local.ativo ?? true],
      );
    }

    for (const equipamento of body.equipamentos || []) {
      const equipamentoId = equipamento.id || makeId("EQP");
      const localId = equipamento.localId && savedLocationIds.has(equipamento.localId) ? equipamento.localId : null;
      await client.query(
        `INSERT INTO ciperprag_hub.cliente_equipamentos
         (id, tenant_id, cliente_id, local_id, tag, descricao, tipo, setor, observacoes, ativo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [equipamentoId, req.auth.user.tenant.id, id, localId, equipamento.tag, equipamento.descricao || null, equipamento.tipo || null, equipamento.setor || null, equipamento.observacoes || null, equipamento.ativo ?? true],
      );
    }
  });
  res.json({ ok: true, id });
});

app.post("/api/services", requirePermission("servicos.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `SRV-${String(Date.now()).slice(-6)}`;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ciperprag_hub.servicos_catalogo (
        id, tenant_id, nome, tipo, descricao, unidade, recorrencia_dias, gera_certificado, validade_certificado_dias,
        produtos_quimicos, epis, riscos, normas_aplicaveis, procedimentos, checklist_itens,
        exige_foto, exige_assinatura, permite_nao_execucao, pop_codigo, pop_titulo, pop_versao, ativo
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      ON CONFLICT (id) DO UPDATE SET
        nome = EXCLUDED.nome,
        tipo = EXCLUDED.tipo,
        descricao = EXCLUDED.descricao,
        unidade = EXCLUDED.unidade,
        recorrencia_dias = EXCLUDED.recorrencia_dias,
        gera_certificado = EXCLUDED.gera_certificado,
        validade_certificado_dias = EXCLUDED.validade_certificado_dias,
        produtos_quimicos = EXCLUDED.produtos_quimicos,
        epis = EXCLUDED.epis,
        riscos = EXCLUDED.riscos,
        normas_aplicaveis = EXCLUDED.normas_aplicaveis,
        procedimentos = EXCLUDED.procedimentos,
        checklist_itens = EXCLUDED.checklist_itens,
        exige_foto = EXCLUDED.exige_foto,
        exige_assinatura = EXCLUDED.exige_assinatura,
        permite_nao_execucao = EXCLUDED.permite_nao_execucao,
        pop_codigo = EXCLUDED.pop_codigo,
        pop_titulo = EXCLUDED.pop_titulo,
        pop_versao = EXCLUDED.pop_versao,
        ativo = EXCLUDED.ativo,
        atualizado_em = NOW()`,
      [
        id,
        req.auth.user.tenant.id,
        body.nome,
        body.tipo,
        body.descricao,
        body.unidade,
        body.recorrenciaDias,
        body.geraCertificado,
        body.validadeCertificadoDias,
        body.produtosQuimicos || [],
        body.epis || [],
        body.riscos || [],
        body.normasAplicaveis || [],
        body.procedimentos || [],
        body.checklistItens || [],
        body.exigeFoto ?? false,
        body.exigeAssinatura ?? true,
        body.permiteNaoExecucao ?? true,
        body.popCodigo || null,
        body.popTitulo || null,
        body.popVersao || null,
        body.ativo,
      ],
    );

    const hasPopData = Boolean(
      body.popCodigo ||
      body.popTitulo ||
      body.popObjetivo ||
      body.popAplicacao ||
      (body.popResponsabilidades || []).length ||
      (body.popMateriais || []).length ||
      (body.procedimentos || []).length ||
      (body.checklistItens || []).length,
    );

    if (!hasPopData) {
      await client.query("UPDATE ciperprag_hub.servicos_catalogo SET pop_ativo_id = NULL WHERE id = $1", [id]);
      return;
    }

    const popCodigo = body.popCodigo || `POP-${id}`;
    const popTitulo = body.popTitulo || body.nome;
    const popVersao = body.popVersao || "001";
    const { rows: popRows } = await client.query(
      `INSERT INTO ciperprag_hub.servico_pops (
        id, tenant_id, servico_id, codigo, titulo, versao, status, objetivo, aplicacao,
        responsabilidades, materiais, procedimentos, checklist_itens, aprovado_por, aprovado_em
      )
      VALUES ($1,$2,$3,$4,$5,$6,'ativo',$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (servico_id, codigo, versao) DO UPDATE SET
        titulo = EXCLUDED.titulo,
        status = 'ativo',
        objetivo = EXCLUDED.objetivo,
        aplicacao = EXCLUDED.aplicacao,
        responsabilidades = EXCLUDED.responsabilidades,
        materiais = EXCLUDED.materiais,
        procedimentos = EXCLUDED.procedimentos,
        checklist_itens = EXCLUDED.checklist_itens,
        aprovado_por = EXCLUDED.aprovado_por,
        aprovado_em = EXCLUDED.aprovado_em,
        atualizado_em = NOW()
      RETURNING id`,
      [
        makeId("POP"),
        req.auth.user.tenant.id,
        id,
        popCodigo,
        popTitulo,
        popVersao,
        body.popObjetivo || body.descricao || null,
        body.popAplicacao || null,
        body.popResponsabilidades || [],
        body.popMateriais || [],
        body.procedimentos || [],
        body.checklistItens || [],
        body.popAprovadoPor || null,
        body.popAprovadoEm || null,
      ],
    );
    const popId = popRows[0].id;
    await client.query(
      "UPDATE ciperprag_hub.servico_pops SET status = 'inativo', atualizado_em = NOW() WHERE servico_id = $1 AND id <> $2 AND status = 'ativo'",
      [id, popId],
    );
    await client.query("UPDATE ciperprag_hub.servicos_catalogo SET pop_ativo_id = $2 WHERE id = $1", [id, popId]);
  });
  res.json({ ok: true, id });
});

app.post("/api/technicians", requirePermission("equipes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `TEC-${String(Date.now()).slice(-6)}`;
  await query(
    `INSERT INTO ciperprag_hub.tecnicos (id, nome, cpf, cargo, data_admissao, telefone, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome, cpf=EXCLUDED.cpf, cargo=EXCLUDED.cargo, data_admissao=EXCLUDED.data_admissao, telefone=EXCLUDED.telefone, ativo=EXCLUDED.ativo, atualizado_em = NOW()`,
    [id, body.nome, body.cpf, body.cargo, body.dataAdmissao || null, body.telefone, body.ativo],
  );
  res.json({ ok: true, id });
});

app.post("/api/vehicles", requirePermission("equipes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `VEI-${String(Date.now()).slice(-6)}`;
  await query(
    `INSERT INTO ciperprag_hub.veiculos (id, placa, modelo, ano, ativo)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET placa=EXCLUDED.placa, modelo=EXCLUDED.modelo, ano=EXCLUDED.ano, ativo=EXCLUDED.ativo, atualizado_em = NOW()`,
    [id, body.placa, body.modelo, body.ano, body.ativo],
  );
  res.json({ ok: true, id });
});

app.post("/api/allocations", requirePermission("equipes.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `AL-${String(Date.now()).slice(-6)}`;
  await query(
    `INSERT INTO ciperprag_hub.alocacoes_semanais (id, tecnico_id, veiculo_id, dia_semana, cliente, servico, turno)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET tecnico_id=EXCLUDED.tecnico_id, veiculo_id=EXCLUDED.veiculo_id, dia_semana=EXCLUDED.dia_semana, cliente=EXCLUDED.cliente, servico=EXCLUDED.servico, turno=EXCLUDED.turno`,
    [id, body.tecnicoId, body.veiculoId || null, body.diaSemana, body.cliente, body.servico, body.turno],
  );
  res.json({ ok: true, id });
});

app.patch("/api/company-config", requirePermission("configuracoes.manage"), async (req, res) => {
  const body = req.body;
  await query(
    `UPDATE ciperprag_hub.empresa_config SET
      razao_social=$1, nome_fantasia=$2, cnpj=$3, endereco=$4, telefone=$5, email=$6, logo_url=$7,
      alvara=$8, cr02=$9, anvisa=$10, vigilancia_sanitaria=$11, responsavel_tecnico=$12, responsavel_execucao=$13, cargo_responsavel=$14,
      certificado_validade_padrao_dias=$15, certificado_texto_legal=$16, certificado_texto_fixacao=$17, telefone_emergencia=$18,
      medicao_forma_pagamento_padrao=$19, medicao_local_entrega_padrao=$20, atualizado_em=NOW()
      WHERE id = (SELECT id FROM ciperprag_hub.empresa_config ORDER BY id LIMIT 1)`,
    [
      body.razaoSocial,
      body.nomeFantasia,
      body.cnpj,
      body.endereco,
      body.telefone,
      body.email,
      body.logoUrl,
      body.alvara,
      body.cr02,
      body.anvisa,
      body.vigilanciaSanitaria,
      body.responsavelTecnico,
      body.responsavelExecucao,
      body.cargoResponsavel,
      body.certificadoValidadePadraoDias ?? 30,
      body.certificadoTextoLegal || null,
      body.certificadoTextoFixacao || null,
      body.telefoneEmergencia || null,
      body.medicaoFormaPagamentoPadrao || null,
      body.medicaoLocalEntregaPadrao || null,
    ],
  );
  res.json({ ok: true });
});

app.patch("/api/numbering-config", requirePermission("configuracoes.manage"), async (req, res) => {
  const body = req.body;
  await query(
    `UPDATE ciperprag_hub.numeracao_config SET
      proposta_formato=$1, proposta_ultimo=$2, contrato_formato=$3, contrato_ultimo=$4, os_formato=$5, os_ultimo=$6,
      certificado_formato=$7, certificado_ultimo=$8, medicao_formato=$9, medicao_ultimo=$10, atualizado_em = NOW()
      WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config ORDER BY id LIMIT 1)`,
    [
      body.propostaFormato,
      body.propostaUltimo,
      body.contratoFormato,
      body.contratoUltimo,
      body.osFormato,
      body.osUltimo,
      body.certificadoFormato,
      body.certificadoUltimo,
      body.medicaoFormato,
      body.medicaoUltimo,
    ],
  );
  res.json({ ok: true });
});

app.post("/api/contract-templates", requirePermission("contratos.manage"), async (req, res) => {
  const body = req.body;
  const id = body.id || `TPL-${String(Date.now()).slice(-6)}`;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ciperprag_hub.contratos_templates (id, numero, cliente_id, tipo, vigencia_meses, forma_pagamento, prazo_pagamento_dias, status, data_criacao, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET numero=EXCLUDED.numero, cliente_id=EXCLUDED.cliente_id, tipo=EXCLUDED.tipo, vigencia_meses=EXCLUDED.vigencia_meses, forma_pagamento=EXCLUDED.forma_pagamento, prazo_pagamento_dias=EXCLUDED.prazo_pagamento_dias, status=EXCLUDED.status, data_criacao=EXCLUDED.data_criacao, observacoes=EXCLUDED.observacoes`,
      [id, body.numero, body.clienteId, body.tipo, body.vigenciaMeses, body.formaPagamento, body.prazoPagamentoDias, body.status, body.dataCriacao, body.observacoes],
    );
    await client.query("DELETE FROM ciperprag_hub.contratos_templates_servicos WHERE template_id = $1", [id]);
    for (const servico of body.servicos || []) {
      await client.query(
        `INSERT INTO ciperprag_hub.contratos_templates_servicos (template_id, servico_id, quantidade, valor_unitario, frequencia)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, servico.servicoId, servico.quantidade, servico.valorUnitario, servico.frequencia],
      );
    }
  });
  res.json({ ok: true, id });
});

app.post("/api/contract-templates/:id/generate-contract", requirePermission("contratos.manage"), async (req, res) => {
  const id = req.params.id;
  const next = await nextSequential("contrato_ultimo");
  const year = new Date().getFullYear();
  const number = `CT-${next}/${year}`;
  const { rows } = await query("SELECT * FROM ciperprag_hub.contratos_templates WHERE id = $1", [id]);
  const item = rows[0];
  if (!item) return res.status(404).json({ error: "Modelo não encontrado" });
  const newId = `TPL-${String(Date.now()).slice(-6)}`;
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO ciperprag_hub.contratos_templates (id, numero, cliente_id, tipo, vigencia_meses, forma_pagamento, prazo_pagamento_dias, status, data_criacao, observacoes)
       VALUES ($1,$2,$3,'contrato',$4,$5,$6,'vigente',$7,$8)`,
      [newId, number, item.cliente_id, item.vigencia_meses, item.forma_pagamento, item.prazo_pagamento_dias, new Date().toISOString().split("T")[0], `Gerado a partir da proposta ${item.numero}. ${item.observacoes || ""}`],
    );
    const { rows: services } = await client.query("SELECT * FROM ciperprag_hub.contratos_templates_servicos WHERE template_id = $1", [id]);
    for (const service of services) {
      await client.query(
        `INSERT INTO ciperprag_hub.contratos_templates_servicos (template_id, servico_id, quantidade, valor_unitario, frequencia)
         VALUES ($1,$2,$3,$4,$5)`,
        [newId, service.servico_id, service.quantidade, service.valor_unitario, service.frequencia],
      );
    }
  });
  res.json({ ok: true });
});

app.post("/api/measurements/generate", requirePermission("medicoes.manage"), async (req, res) => {
  const { clienteNome, dataInicio, dataFim } = req.body;
  if (!clienteNome || !dataInicio || !dataFim) return res.status(400).json({ error: "Cliente e periodo sao obrigatorios." });

  const measurement = await withTransaction(async (client) => {
    const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config ORDER BY id LIMIT 1");
    const company = companyRows[0];
    const { rows: clientRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE razao_social = $1 OR nome_fantasia = $1 LIMIT 1", [clienteNome]);
    const customer = clientRows[0];
    const { rows: numRows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config
       SET medicao_ultimo = medicao_ultimo + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config ORDER BY id LIMIT 1)
       RETURNING medicao_formato, medicao_ultimo`,
    );
    const number = formatSequential(numRows[0]?.medicao_formato, numRows[0]?.medicao_ultimo || 1);

    const { rows: orderRows } = await client.query(
      `SELECT
         o.*,
         c.valor_unitario
       FROM ciperprag_hub.ordens_servico o
       LEFT JOIN ciperprag_hub.contratos c ON c.id = o.contrato_id
       WHERE o.status = 'encerrada'
         AND COALESCE(o.nao_executada, FALSE) = FALSE
         AND o.cliente = $1
         AND COALESCE(o.data_execucao, o.data_emissao) BETWEEN $2 AND $3
         AND NOT EXISTS (
           SELECT 1
           FROM ciperprag_hub.medicao_itens mi
           JOIN ciperprag_hub.medicoes m_exist ON m_exist.id = mi.medicao_id
           WHERE mi.os_id = o.id
             AND m_exist.status <> 'cancelada'
         )
       ORDER BY COALESCE(o.data_execucao, o.data_emissao), o.numero`,
      [clienteNome, dataInicio, dataFim],
    );

    if (!orderRows.length) {
      const error = new Error("Nenhuma OS encerrada e ainda nao medida foi encontrada para o periodo.");
      error.status = 400;
      throw error;
    }

    const items = orderRows.map((order) => {
      const quantidade = Number(order.quantidade || 0);
      const valorUnitario = Number(order.valor_unitario || 0);
      return {
        osId: order.id,
        osNumero: order.numero,
        contratoId: order.contrato_id,
        servico: order.servico,
        dataExecucao: order.data_execucao?.toISOString?.().split("T")[0] ?? order.data_execucao ?? order.data_emissao?.toISOString?.().split("T")[0] ?? order.data_emissao,
        quantidade,
        unidade: order.unidade,
        valorUnitario,
        valorTotal: quantidade * valorUnitario,
      };
    });
    const total = items.reduce((sum, item) => sum + item.valorTotal, 0);
    const id = makeId("MED");
    const endereco = customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : null;
    const snapshot = {
      numero: number,
      cliente: {
        id: customer?.id || null,
        nome: clienteNome,
        cnpj: customer?.cnpj || orderRows[0]?.cnpj || null,
        endereco,
      },
      periodo: { inicio: dataInicio, fim: dataFim },
      empresa: {
        razaoSocial: company?.razao_social || null,
        nomeFantasia: company?.nome_fantasia || null,
        cnpj: company?.cnpj || null,
        endereco: company?.endereco || null,
      },
      formaPagamento: company?.medicao_forma_pagamento_padrao || null,
      localEntrega: company?.medicao_local_entrega_padrao || null,
      itens: items,
      total,
    };

    await client.query(
      `INSERT INTO ciperprag_hub.medicoes
       (id, numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, periodo_inicio, periodo_fim, status, total, forma_pagamento, local_entrega, snapshot_dados)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'emitida',$9,$10,$11,$12)`,
      [id, number, customer?.id || null, clienteNome, customer?.cnpj || orderRows[0]?.cnpj || null, endereco, dataInicio, dataFim, total, company?.medicao_forma_pagamento_padrao || null, company?.medicao_local_entrega_padrao || null, JSON.stringify(snapshot)],
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO ciperprag_hub.medicao_itens
         (medicao_id, os_id, os_numero, contrato_id, servico, data_execucao, quantidade, unidade, valor_unitario, valor_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, item.osId, item.osNumero, item.contratoId, item.servico, item.dataExecucao, item.quantidade, item.unidade, item.valorUnitario, item.valorTotal],
      );
    }
    await saveImmutableDocumentAttachment(client, {
      tenantId: req.auth.user.tenant.id,
      userId: req.auth.user.id,
      entityType: "medicao",
      entityId: id,
      fileName: `medicao-${number.replaceAll("/", "-")}.html`,
      html: buildHistoricalMeasurementHtml(snapshot, { id, numero: number, cliente_nome: clienteNome, periodo_inicio: dataInicio, periodo_fim: dataFim, total }),
      metadata: { origem: "geracao_medicao", numero: number, periodo: { inicio: dataInicio, fim: dataFim } },
    });
    await logAuditEvent(client, req, {
      entityType: "medicao",
      entityId: id,
      action: "measurement_generated",
      summary: `Medicao ${number} gerada para ${clienteNome}`,
      after: { numero: number, clienteNome, periodoInicio: dataInicio, periodoFim: dataFim, total, itens: items.length },
    });

    return {
      id,
      numero: number,
      clienteId: customer?.id || null,
      clienteNome,
      clienteCnpj: customer?.cnpj || orderRows[0]?.cnpj || null,
      clienteEndereco: endereco,
      periodoInicio: dataInicio,
      periodoFim: dataFim,
      status: "emitida",
      total,
      formaPagamento: company?.medicao_forma_pagamento_padrao || null,
      localEntrega: company?.medicao_local_entrega_padrao || null,
      snapshotDados: snapshot,
      criadoEm: new Date().toISOString(),
      itens: items,
    };
  });

  res.json({ ok: true, measurement });
});

app.patch("/api/measurements/:id/cancel", requirePermission("medicoes.manage"), async (req, res) => {
  const { rowCount } = await query("UPDATE ciperprag_hub.medicoes SET status = 'cancelada', atualizado_em = NOW() WHERE id = $1", [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: "Medicao nao encontrada." });
  await logAuditEvent(null, req, {
    entityType: "medicao",
    entityId: req.params.id,
    action: "measurement_cancelled",
    summary: `Medicao ${req.params.id} cancelada`,
  });
  res.json({ ok: true });
});

app.post("/api/agendamentos", requirePermission("agenda.manage"), async (req, res) => {
  const id = await upsertSchedule(req.body);
  await logAuditEvent(null, req, {
    entityType: "agendamento",
    entityId: id,
    action: req.body.id ? "schedule_updated" : "schedule_created",
    summary: `${req.body.id ? "Agendamento atualizado" : "Agendamento criado"} para ${req.body.clienteNome || req.body.cliente || id}`,
    after: { ...req.body, id },
  });
  res.json({ ok: true, id });
});

app.patch("/api/agendamentos/:id", requirePermission("agenda.manage"), async (req, res) => {
  const current = (await getSchedules()).find((item) => item.id === req.params.id);
  if (!current) return res.status(404).json({ error: "Agendamento não encontrado" });
  const id = await upsertSchedule({ ...current, ...req.body, id: req.params.id });
  await logAuditEvent(null, req, {
    entityType: "agendamento",
    entityId: id,
    action: "schedule_updated",
    summary: `Agendamento ${id} atualizado`,
    before: current,
    after: { ...current, ...req.body, id },
  });
  res.json({ ok: true, id });
});

app.post("/api/agendamentos/:id/gerar-os", requirePermission("os.manage"), async (req, res) => {
  const agendamentoId = req.params.id;
  const leaderName = req.body.tecnicoNome;
  const result = await withTransaction(async (client) => {
    const { rows: agRows } = await client.query("SELECT * FROM ciperprag_hub.agendamentos WHERE id = $1", [agendamentoId]);
    const ag = agRows[0];
    if (!ag) throw new Error("Agendamento não encontrado");
    const { rows: contractRows } = await client.query("SELECT * FROM ciperprag_hub.contratos WHERE id = $1", [ag.contrato_id]);
    const contract = contractRows[0];
    const { rows: clientRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1", [ag.cliente_id]);
    const customer = clientRows[0];
    const { rows: techRows } = await client.query("SELECT * FROM ciperprag_hub.tecnicos WHERE nome = $1", [leaderName || ag.tecnicos_nomes?.[0]]);
    const tech = techRows[0];
    const service = await getServiceForSnapshot(client, ag.servico);
    const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config ORDER BY id LIMIT 1");
    const company = companyRows[0];
    const { rows: numRows } = await client.query(
      `UPDATE ciperprag_hub.numeracao_config SET os_ultimo = os_ultimo + 1, atualizado_em = NOW()
       WHERE id = (SELECT id FROM ciperprag_hub.numeracao_config ORDER BY id LIMIT 1)
       RETURNING os_ultimo`,
    );
    const number = `OS-${numRows[0].os_ultimo}`;
    const orderId = makeId("OSDB");
    await client.query(
      `INSERT INTO ciperprag_hub.ordens_servico
      (id, numero, agendamento_id, cliente_id, cliente, cnpj, cliente_endereco, cliente_logo_url, contrato_id, servico, tipo, tecnico, tecnico_cpf, tecnico_data_admissao, equipe_tecnicos_ids, equipe_tecnicos_nomes, veiculo_id, veiculo_descricao, local_execucao, tags, observacao, data_emissao, quantidade, unidade, status, fotos)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,CURRENT_DATE,1,$22,'aberta',$23)`,
      [orderId, number, agendamentoId, ag.cliente_id, ag.cliente, ag.cliente_cnpj, customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : null, customer?.logo_url || null, ag.contrato_id, ag.servico, ag.tipo, tech?.nome || leaderName || ag.tecnicos_nomes?.[0] || "", tech?.cpf || null, tech?.data_admissao || null, ag.tecnicos_ids || [], ag.tecnicos_nomes || [], ag.veiculo_id || null, ag.veiculo_descricao || null, ag.local_execucao || null, ag.tags || null, ag.observacao || null, contract?.unidade || null, []],
    );
    const { rows: insertedOrderRows } = await client.query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1", [orderId]);
    const snapshot = buildOrderOperationalSnapshot({
      order: insertedOrderRows[0],
      customer,
      contract,
      service,
      company,
      technician: tech,
      phase: "emissao",
    });
    await client.query(
      "UPDATE ciperprag_hub.ordens_servico SET snapshot_dados = $2, snapshot_emitido_em = NOW() WHERE id = $1",
      [orderId, JSON.stringify(snapshot)],
    );
    await client.query("UPDATE ciperprag_hub.agendamentos SET status = 'os_gerada', os_id = $2 WHERE id = $1", [agendamentoId, orderId]);
    await logAuditEvent(client, req, {
      entityType: "os",
      entityId: orderId,
      action: "order_generated",
      summary: `OS ${number} gerada a partir do agendamento ${agendamentoId}`,
      after: { numero: number, agendamentoId, cliente: ag.cliente, servico: ag.servico, tecnico: tech?.nome || leaderName || ag.tecnicos_nomes?.[0] || "" },
    });
    return orderId;
  });
  res.json({ ok: true, id: result });
});

app.patch("/api/orders/:id", requirePermission("os.manage"), async (req, res) => {
  const current = (await getOrders()).find((item) => item.id === req.params.id);
  if (!current) return res.status(404).json({ error: "OS não encontrada" });
  const body = { ...current, ...req.body };
  await query(
    `UPDATE ciperprag_hub.ordens_servico SET
      tecnico=$2, local_execucao=$3, observacao=$4, tags=$5, tag_equipamento_servico=$6, updated_at=NOW()
     WHERE id = $1`,
    [req.params.id, body.tecnicoNome, body.localExecucao, body.observacao || null, body.tags || null, body.tagEquipamentoServico || null],
  ).catch(async () => {
    await query(`UPDATE ciperprag_hub.ordens_servico SET tecnico=$2, local_execucao=$3, observacao=$4, tags=$5, tag_equipamento_servico=$6 WHERE id = $1`, [req.params.id, body.tecnicoNome, body.localExecucao, body.observacao || null, body.tags || null, body.tagEquipamentoServico || null]);
  });
  await logAuditEvent(null, req, {
    entityType: "os",
    entityId: req.params.id,
    action: "order_updated",
    summary: `OS ${current.numero || req.params.id} atualizada`,
    before: {
      tecnicoNome: current.tecnicoNome,
      localExecucao: current.localExecucao,
      observacao: current.observacao,
      tags: current.tags,
      tagEquipamentoServico: current.tagEquipamentoServico,
    },
    after: {
      tecnicoNome: body.tecnicoNome,
      localExecucao: body.localExecucao,
      observacao: body.observacao,
      tags: body.tags,
      tagEquipamentoServico: body.tagEquipamentoServico,
    },
  });
  res.json({ ok: true });
});

app.post("/api/orders/:id/encerrar", requirePermission("os.close"), async (req, res) => {
  const orderId = req.params.id;
  const { dataExecucao, quantidade, tagEquipamentoServico, fotos, checklistRespostas, naoExecutada, motivoNaoExecucao } = req.body;

  const response = await withTransaction(async (client) => {
    const { rows: orderRows } = await client.query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1", [orderId]);
    const order = orderRows[0];
    if (!order) throw new Error("OS não encontrada");

    const { rows: contractRows } = await client.query("SELECT * FROM ciperprag_hub.contratos WHERE id = $1", [order.contrato_id]);
    const contract = contractRows[0];
    const service = await getServiceForSnapshot(client, order.servico);
    const { rows: companyRows } = await client.query("SELECT * FROM ciperprag_hub.empresa_config ORDER BY id LIMIT 1");
    const company = companyRows[0];
    const { rows: customerRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1", [order.cliente_id]);
    const customer = customerRows[0];
    const { rows: techRows } = await client.query("SELECT * FROM ciperprag_hub.tecnicos WHERE nome = $1", [order.tecnico]);
    const technician = techRows[0];
    const qty = Number(quantidade || 1);
    const isNotExecuted = Boolean(naoExecutada);

    if (isNotExecuted && !String(motivoNaoExecucao || "").trim()) {
      const error = new Error("Informe o motivo da nao execucao.");
      error.status = 400;
      throw error;
    }

    if (!isNotExecuted && service?.exige_foto && (!Array.isArray(fotos) || fotos.length === 0)) {
      const error = new Error("Este servico exige ao menos uma foto de evidencia.");
      error.status = 400;
      throw error;
    }

    await client.query(
      `UPDATE ciperprag_hub.ordens_servico
       SET status = 'encerrada',
           data_execucao = $2,
           quantidade = $3,
           tag_equipamento_servico = $4,
           fotos = $5,
           checklist_respostas = $6,
           nao_executada = $7,
           motivo_nao_execucao = $8
       WHERE id = $1`,
      [orderId, dataExecucao, isNotExecuted ? 0 : qty, tagEquipamentoServico || null, fotos || [], JSON.stringify(checklistRespostas || []), isNotExecuted, motivoNaoExecucao || null],
    );

    await client.query("DELETE FROM ciperprag_hub.evidencias_anexos WHERE entidade_tipo = 'os' AND entidade_id = $1 AND categoria = 'foto'", [orderId]);
    for (const [index, foto] of (Array.isArray(fotos) ? fotos : []).entries()) {
      const parsed = parseDataUrl(foto);
      await client.query(
        `INSERT INTO ciperprag_hub.evidencias_anexos
         (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes, conteudo_base64, metadados, criado_por)
         VALUES ($1,$2,'os',$3,'foto',$4,$5,$6,$7,$8,$9)`,
        [
          `${makeId("EV")}-${index + 1}`,
          req.auth.user.tenant.id,
          orderId,
          `evidencia-${String(index + 1).padStart(2, "0")}.jpg`,
          parsed.mimeType || "image/jpeg",
          parsed.bytes,
          foto,
          JSON.stringify({ origem: "encerramento_os", posicao: index + 1, dataExecucao }),
          req.auth.user.id,
        ],
      );
    }
    const { rows: updatedOrderRows } = await client.query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1", [orderId]);
    const { rows: evidenceRows } = await client.query("SELECT * FROM ciperprag_hub.evidencias_anexos WHERE entidade_tipo = 'os' AND entidade_id = $1 ORDER BY criado_em, id", [orderId]);
    const snapshot = buildOrderOperationalSnapshot({
      order: updatedOrderRows[0],
      customer,
      contract,
      service,
      company,
      technician,
      evidences: evidenceRows,
      checklistRespostas: checklistRespostas || [],
      phase: "encerramento",
      existing: order.snapshot_dados || {},
    });
    await client.query(
      "UPDATE ciperprag_hub.ordens_servico SET snapshot_dados = $2, snapshot_encerrado_em = NOW() WHERE id = $1",
      [orderId, JSON.stringify(snapshot)],
    );
    await saveImmutableDocumentAttachment(client, {
      tenantId: req.auth.user.tenant.id,
      userId: req.auth.user.id,
      entityType: "os",
      entityId: orderId,
      fileName: `os-${updatedOrderRows[0].numero || orderId}-final.html`,
      html: buildHistoricalOrderHtml(snapshot, updatedOrderRows[0]),
      metadata: { origem: "encerramento_os", osNumero: updatedOrderRows[0].numero, dataExecucao },
    });

    if (!isNotExecuted) {
      await client.query(
        `UPDATE ciperprag_hub.contratos
         SET executado = COALESCE(executado, 0) + $2,
             ultima_execucao = $3,
             status = CASE WHEN COALESCE(executado, 0) + $2 >= contratado THEN 'vencido' ELSE 'ativo' END,
             atualizado_em = NOW()
         WHERE id = $1`,
        [order.contrato_id, qty, dataExecucao],
      ).catch(async () => {
        await client.query(
          `UPDATE ciperprag_hub.contratos
           SET executado = COALESCE(executado, 0) + $2,
               ultima_execucao = $3,
               status = CASE WHEN COALESCE(executado, 0) + $2 >= contratado THEN 'vencido' ELSE 'ativo' END
           WHERE id = $1`,
          [order.contrato_id, qty, dataExecucao],
        );
      });
    }

    if (order.agendamento_id) {
      await client.query("UPDATE ciperprag_hub.agendamentos SET status = 'encerrado' WHERE id = $1", [order.agendamento_id]);
    }

    let certificateHash = null;
    if (!isNotExecuted && (service?.gera_certificado || order.tipo === "sanitario")) {
      certificateHash = await issueCertificateForOrder(client, { ...order, data_execucao: dataExecucao, quantidade: isNotExecuted ? 0 : qty, tag_equipamento_servico: tagEquipamentoServico || order.tag_equipamento_servico, fotos: fotos || [] }, { dataExecucao });
      await logAuditEvent(client, req, {
        entityType: "certificado",
        entityId: certificateHash,
        action: "certificate_generated",
        summary: `Certificado ${certificateHash} gerado automaticamente no encerramento da OS ${order.numero || orderId}`,
        after: { hash: certificateHash, osId: orderId, osNumero: order.numero, cliente: order.cliente, servico: order.servico },
      });
    }

    const recorrenciaDias = Number(service?.recorrencia_dias || contract?.validade_dias || 0);
    if (!isNotExecuted && recorrenciaDias > 0) {
      await client.query(
        `INSERT INTO ciperprag_hub.recorrencia_sugestoes
         (id, cliente_id, cliente_nome, cliente_cnpj, contrato_id, servico, tipo, local_execucao, tags, observacao, tecnicos_ids, tecnicos_nomes, veiculo_id, veiculo_descricao, suggested_date, source_agendamento_id, source_os_id, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pendente')`,
        [makeId("RC"), order.cliente_id, order.cliente, order.cnpj, order.contrato_id, order.servico, order.tipo, order.local_execucao, order.tags || null, order.observacao || null, order.equipe_tecnicos_ids || [], order.equipe_tecnicos_nomes || [], order.veiculo_id || null, order.veiculo_descricao || null, addDays(dataExecucao, recorrenciaDias), order.agendamento_id || null, orderId],
      );
    }
    await logAuditEvent(client, req, {
      entityType: "os",
      entityId: orderId,
      action: "order_closed",
      summary: `OS ${order.numero || orderId} encerrada${isNotExecuted ? " como nao executada" : ""}`,
      before: { status: order.status, quantidade: order.quantidade, dataExecucao: order.data_execucao },
      after: {
        status: "encerrada",
        dataExecucao,
        quantidade: isNotExecuted ? 0 : qty,
        naoExecutada: isNotExecuted,
        fotos: Array.isArray(fotos) ? fotos.length : 0,
        certificadoHash,
      },
    });

    return { certificateHash };
  });

  res.json({ ok: true, ...response });
});

app.post("/api/orders/:id/certificado", requirePermission("certificados.manage"), async (req, res) => {
  const orderId = req.params.id;
  const { rows: orderRows } = await query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1", [orderId]);
  const order = orderRows[0];
  if (!order) return res.status(404).json({ error: "OS nao encontrada" });
  if (order.nao_executada) return res.status(400).json({ error: "Nao e possivel gerar certificado para OS nao executada." });
  const hash = await withTransaction(async (client) => {
    const certificateHash = await issueCertificateForOrder(client, order);
    await logAuditEvent(client, req, {
      entityType: "certificado",
      entityId: certificateHash,
      action: "certificate_generated",
      summary: `Certificado ${certificateHash} gerado para OS ${order.numero || orderId}`,
      after: { hash: certificateHash, osId: orderId, osNumero: order.numero, cliente: order.cliente, servico: order.servico },
    });
    return certificateHash;
  });
  res.json({ ok: true, hash });
});

app.post("/api/orders/:id/certificado", requirePermission("certificados.manage"), async (req, res) => {
  const orderId = req.params.id;
  const { rows: orderRows } = await query("SELECT * FROM ciperprag_hub.ordens_servico WHERE id = $1", [orderId]);
  const order = orderRows[0];
  if (!order) return res.status(404).json({ error: "OS não encontrada" });
  const { rows: serviceRows } = await query("SELECT * FROM ciperprag_hub.servicos_catalogo WHERE nome = $1", [order.servico]);
  const service = serviceRows[0];
  const { rows: clientRows } = await query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1", [order.cliente_id]);
  const customer = clientRows[0];
  const certId = makeId("CERT");
  const hash = await generateUniqueCertificateHash();
  const { rows: countRows } = await query("SELECT COUNT(*)::int AS total FROM ciperprag_hub.certificados");
  const certNumber = `${7297 + countRows[0].total}/${new Date().getFullYear()}`;
  await query(
    `INSERT INTO ciperprag_hub.certificados
    (id, hash, numero, os_id, os_numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, cliente_logo_url, contrato_id, servico, tecnico_nome, local_execucao, data_execucao, emitido_em, validade_dias, produtos_quimicos)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),$16,$17)`,
    [certId, hash, certNumber, order.id, order.numero, order.cliente_id, order.cliente, order.cnpj, customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : order.cliente_endereco, customer?.logo_url || order.cliente_logo_url || null, order.contrato_id, order.servico, order.tecnico, order.local_execucao, order.data_execucao || order.data_emissao, service?.validade_certificado_dias || 0, service?.produtos_quimicos || []],
  );
  await query("UPDATE ciperprag_hub.ordens_servico SET certificado_hash = $2 WHERE id = $1", [orderId, hash]);
  res.json({ ok: true, hash });
});

app.patch("/api/recurrence-suggestions/:id", requirePermission("agenda.manage"), async (req, res) => {
  const id = req.params.id;
  const action = req.body.action;
  const { rows } = await query("SELECT * FROM ciperprag_hub.recorrencia_sugestoes WHERE id = $1", [id]);
  const suggestion = rows[0];
  if (!suggestion) return res.status(404).json({ error: "Sugestão não encontrada" });

  if (action === "confirm") {
    await withTransaction(async (client) => {
      const newId = makeId("AG");
      await client.query(
        `INSERT INTO ciperprag_hub.agendamentos
         (id, contrato_id, cliente_id, cliente, cliente_cnpj, servico, tipo, data_agendada, local_execucao, tags, observacao, tecnicos_ids, tecnicos_nomes, veiculo_id, veiculo_descricao, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'agendado',NOW())`,
        [newId, suggestion.contrato_id, suggestion.cliente_id, suggestion.cliente_nome, suggestion.cliente_cnpj, suggestion.servico, suggestion.tipo, suggestion.suggested_date, suggestion.local_execucao, suggestion.tags, suggestion.observacao, suggestion.tecnicos_ids || [], suggestion.tecnicos_nomes || [], suggestion.veiculo_id, suggestion.veiculo_descricao],
      );
      await client.query("UPDATE ciperprag_hub.recorrencia_sugestoes SET status = 'confirmada' WHERE id = $1", [id]);
      await logAuditEvent(client, req, {
        entityType: "recorrencia",
        entityId: id,
        action: "recurrence_confirmed",
        summary: `Recorrencia ${id} confirmada e novo agendamento ${newId} criado`,
        after: { agendamentoId: newId, suggestedDate: suggestion.suggested_date, cliente: suggestion.cliente_nome, servico: suggestion.servico },
      });
    });
  } else {
    await query("UPDATE ciperprag_hub.recorrencia_sugestoes SET status = 'dispensada' WHERE id = $1", [id]);
    await logAuditEvent(null, req, {
      entityType: "recorrencia",
      entityId: id,
      action: "recurrence_dismissed",
      summary: `Recorrencia ${id} dispensada`,
      after: { suggestedDate: suggestion.suggested_date, cliente: suggestion.cliente_nome, servico: suggestion.servico },
    });
  }
  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ error: error.message || "Erro interno no servidor" });
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

async function start() {
  await ensureDatabaseShape();
  await query("SELECT 1");
  app.listen(PORT, () => {
    console.log(`API Ciperprag ouvindo em http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar API:", error.message);
  process.exit(1);
});
