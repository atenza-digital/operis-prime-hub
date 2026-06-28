import express from "express";
import cors from "cors";
import path from "node:path";
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
  const { rows } = await query("SELECT * FROM ciperprag_hub.servicos_catalogo ORDER BY id");
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
    procedimentos: row.procedimentos ?? [],
    checklistItens: row.checklist_itens ?? [],
    exigeFoto: row.exige_foto,
    exigeAssinatura: row.exige_assinatura,
    permiteNaoExecucao: row.permite_nao_execucao,
    popCodigo: row.pop_codigo,
    popTitulo: row.pop_titulo,
    popVersao: row.pop_versao,
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

async function getOrders() {
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
    certificadoHash: row.certificado_hash,
    checklistRespostas: row.checklist_respostas ?? [],
    naoExecutada: row.nao_executada ?? false,
    motivoNaoExecucao: row.motivo_nao_execucao,
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
    status: buildCertificateStatus(row.data_execucao?.toISOString?.().split("T")[0] ?? row.data_execucao, Number(row.validade_dias || 0)),
    produtosQuimicos: row.produtos_quimicos ?? [],
    produtosDetalhados: row.produtos_detalhados ?? [],
    tagEquipamentoServico: row.tag_equipamento_servico,
    quantidade: Number(row.quantidade || 0),
    unidade: row.unidade,
    fotos: row.fotos ?? [],
  };
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

async function getBootstrap() {
  const [companyConfig, numberingConfig, clients, services, contracts, schedules, orders, certificates, technicians, vehicles, allocations, contractTemplates, recurrenceSuggestions] =
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
  await query(
    `INSERT INTO ciperprag_hub.servicos_catalogo (
      id, nome, tipo, descricao, unidade, recorrencia_dias, gera_certificado, validade_certificado_dias,
      produtos_quimicos, epis, riscos, normas_aplicaveis, procedimentos, checklist_itens,
      exige_foto, exige_assinatura, permite_nao_execucao, pop_codigo, pop_titulo, pop_versao, ativo
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
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

app.post("/api/agendamentos", requirePermission("agenda.manage"), async (req, res) => {
  const id = await upsertSchedule(req.body);
  res.json({ ok: true, id });
});

app.patch("/api/agendamentos/:id", requirePermission("agenda.manage"), async (req, res) => {
  const current = (await getSchedules()).find((item) => item.id === req.params.id);
  if (!current) return res.status(404).json({ error: "Agendamento não encontrado" });
  const id = await upsertSchedule({ ...current, ...req.body, id: req.params.id });
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
    await client.query("UPDATE ciperprag_hub.agendamentos SET status = 'os_gerada', os_id = $2 WHERE id = $1", [agendamentoId, orderId]);
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
    const { rows: serviceRows } = await client.query("SELECT * FROM ciperprag_hub.servicos_catalogo WHERE nome = $1", [order.servico]);
    const service = serviceRows[0];
    const { rows: clientRows } = await client.query("SELECT * FROM ciperprag_hub.clientes WHERE id = $1", [order.cliente_id]);
    const customer = clientRows[0];
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
      const certId = makeId("CERT");
      const hash = order.certificado_hash || await generateUniqueCertificateHash(client);
      const countResult = await client.query("SELECT COUNT(*)::int AS total FROM ciperprag_hub.certificados");
      const certNumber = `${7297 + countResult.rows[0].total}/${new Date().getFullYear()}`;
      await client.query(
        `INSERT INTO ciperprag_hub.certificados
         (id, hash, numero, os_id, os_numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, cliente_logo_url, contrato_id, servico, tecnico_nome, local_execucao, data_execucao, emitido_em, validade_dias, produtos_quimicos)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),$16,$17)
         ON CONFLICT (hash) DO NOTHING`,
        [certId, hash, certNumber, order.id, order.numero, order.cliente_id, order.cliente, order.cnpj, customer ? `${customer.endereco}, ${customer.bairro}, ${customer.municipio}-${customer.uf}` : order.cliente_endereco, customer?.logo_url || order.cliente_logo_url || null, order.contrato_id, order.servico, order.tecnico, order.local_execucao, dataExecucao, service?.validade_certificado_dias || 0, service?.produtos_quimicos || []],
      );
      await client.query("UPDATE ciperprag_hub.ordens_servico SET certificado_hash = $2 WHERE id = $1", [orderId, hash]);
      certificateHash = hash;
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

    return { certificateHash };
  });

  res.json({ ok: true, ...response });
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
    });
  } else {
    await query("UPDATE ciperprag_hub.recorrencia_sugestoes SET status = 'dispensada' WHERE id = $1", [id]);
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
