import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword, normalizeEmail } from "../server/auth.mjs";
import { pool, withTransaction } from "../server/db.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = path.join(rootDir, "docs", "evidencias", "etapa7_homologacao");
const baseUrl = (process.env.HOMOLOGATION_BASE_URL || "https://fieldops-homologacao.atenza.digital").replace(/\/$/, "");
const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1]
  || process.env.HOMOLOGATION_E2E_TENANT
  || "empresa-demonstracao";
const e2eEmail = normalizeEmail(process.env.HOMOLOGATION_E2E_EMAIL || "homolog.e2e@atenza.digital");
const onePixelJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EFBABAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";

function brDateTime(value = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(value);
}

function isoDatePlus(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function makePassword() {
  return crypto.randomBytes(18).toString("base64url");
}

function makeLocalId(prefix) {
  return `${prefix}${Date.now().toString(36).slice(-8).toUpperCase()}${crypto.randomBytes(1).toString("hex").toUpperCase()}`;
}

function markdownTable(headers, rows) {
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("|", "\\|")).join(" | ")} |`);
  return [header, divider, ...body].join("\n");
}

function assertE2e(condition, message) {
  if (!condition) throw new Error(`Falha de consistencia E2E: ${message}`);
}

async function prepareE2eUser(password) {
  const passwordHash = await hashPassword(password);
  return withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query("SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1", [tenantSlug]);
    const tenant = tenantRows[0];
    if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);

    const { rows: userRows } = await client.query(
      `INSERT INTO ciperprag_hub.usuarios
       (tenant_id, nome, email, senha_hash, status, senha_alterada_em, senha_temporaria, tentativas_login, bloqueado_ate)
       VALUES ($1,'E2E Homologacao Atenza',$2,$3,'ativo',NOW(),FALSE,0,NULL)
       ON CONFLICT (tenant_id, email) DO UPDATE SET
         nome = EXCLUDED.nome,
         senha_hash = EXCLUDED.senha_hash,
         status = 'ativo',
         senha_temporaria = FALSE,
         senha_alterada_em = NOW(),
         tentativas_login = 0,
         bloqueado_ate = NULL,
         updated_at = NOW()
       RETURNING id`,
      [tenant.id, e2eEmail, passwordHash],
    );
    const user = userRows[0];

    await client.query("DELETE FROM ciperprag_hub.usuario_perfis WHERE usuario_id = $1", [user.id]);
    await client.query(
      `INSERT INTO ciperprag_hub.usuario_perfis (usuario_id, perfil_id)
       SELECT $1, p.id
       FROM ciperprag_hub.perfis p
       WHERE p.tenant_id = $2
         AND p.codigo = 'admin_empresa'
       ON CONFLICT DO NOTHING`,
      [user.id, tenant.id],
    );
    await client.query(
      `INSERT INTO ciperprag_hub.audit_logs
       (tenant_id, usuario_id, entidade_tipo, entidade_id, acao, resumo)
       VALUES ($1,$2,'usuario',$3,'homologation_e2e_prepared','Usuario tecnico de E2E preparado')`,
      [tenant.id, user.id, user.id],
    );
    return user;
  });
}

async function requestJson(pathname, { token, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`${method} ${pathname}: ${payload?.error || payload || `HTTP ${response.status}`}`);
  }
  return payload;
}

function chooseService(services) {
  return [...services]
    .filter((service) => service.ativo !== false)
    .sort((left, right) => {
      const leftScore = Number(Boolean(left.geraCertificado)) * 4 + Number(left.recorrenciaDias > 0) * 3 + Number(left.tipo === "sanitario") * 2;
      const rightScore = Number(Boolean(right.geraCertificado)) * 4 + Number(right.recorrenciaDias > 0) * 3 + Number(right.tipo === "sanitario") * 2;
      return rightScore - leftScore;
    })[0];
}

async function main() {
  const password = makePassword();
  await prepareE2eUser(password);

  const login = await requestJson("/api/auth/login", {
    method: "POST",
    body: { email: e2eEmail, password },
  });
  const token = login.token;

  const before = await requestJson("/api/bootstrap", { token });
  const client = before.clients?.find((item) => item.ativo !== false) || before.clients?.[0];
  const service = chooseService(before.services || []);
  const technician = before.technicians?.find((item) => item.ativo !== false) || before.technicians?.[0];
  const vehicle = before.vehicles?.find((item) => item.ativo !== false) || before.vehicles?.[0];

  if (!client) throw new Error("Nenhum cliente disponivel para E2E.");
  if (!service) throw new Error("Nenhum servico disponivel para E2E.");

  const runId = Date.now().toString(36).toUpperCase();
  const proposalId = makeLocalId("TPL");
  const proposalNumber = `E2E-PROP-${runId}`;
  const today = isoDatePlus(0);
  const scheduledDate = isoDatePlus(2);
  const executionDate = isoDatePlus(2);
  const value = Number(service.valorUnitario || 180) || 180;

  const proposalPayload = {
    id: proposalId,
    numero: proposalNumber,
    clienteId: client.id,
    tipo: "proposta",
    servicos: [{
      servicoId: service.id,
      quantidade: 2,
      valorUnitario: value,
      frequencia: service.recorrenciaDias > 0 ? `A cada ${service.recorrenciaDias} dias` : "Pontual",
    }],
    vigenciaMeses: 12,
    formaPagamento: "Medicao mensal conforme servicos executados",
    prazoPagamentoDias: 30,
    status: "enviado",
    dataCriacao: today,
    observacoes: `Homologacao E2E ${runId}: proposta criada automaticamente para validar fluxo ponta a ponta.`,
  };

  await requestJson("/api/contract-templates", { token, method: "POST", body: proposalPayload });
  await requestJson("/api/contract-templates", {
    token,
    method: "POST",
    body: { ...proposalPayload, status: "aprovado", observacoes: `${proposalPayload.observacoes} Proposta aprovada no E2E tecnico.` },
  });
  const minutaResult = await requestJson(`/api/contract-templates/${proposalId}/generate-minuta`, { token, method: "POST" });

  const afterMinuta = await requestJson("/api/bootstrap", { token });
  const minutaTemplate = afterMinuta.contractTemplates?.find((item) => item.id === minutaResult.id);
  if (!minutaTemplate) throw new Error(`Minuta gerada nao localizada no bootstrap: ${minutaResult.numero}.`);
  await requestJson("/api/contract-templates", {
    token,
    method: "POST",
    body: {
      ...minutaTemplate,
      status: "aprovado",
      observacoes: `${minutaTemplate.observacoes || ""} Minuta aprovada no E2E tecnico.`,
    },
  });

  const contractResult = await requestJson(`/api/contract-templates/${minutaResult.id}/generate-contract`, { token, method: "POST" });

  const afterContract = await requestJson("/api/bootstrap", { token });
  const operationalContract = afterContract.contracts
    ?.filter((contract) => contract.contratoTemplateId === contractResult.id || contract.numeroComercial === contractResult.numero)
    ?.find((contract) => contract.servicoCatalogoId === service.id)
    || afterContract.contracts?.find((contract) => contract.numeroComercial === contractResult.numero);
  if (!operationalContract) throw new Error(`Contrato operacional nao encontrado para ${contractResult.numero}.`);

  const local = client.locaisExecucao?.find((item) => item.ativo)?.nome || operationalContract.locais?.[0] || client.nomeFantasia || client.razaoSocial;
  const equipmentTag = client.equipamentos?.find((item) => item.ativo)?.tag || operationalContract.tags?.[0] || "TAG-E2E";
  const technicianName = technician?.nome || "Equipe Tecnica";

  const scheduleResult = await requestJson("/api/agendamentos", {
    token,
    method: "POST",
    body: {
      contratoId: operationalContract.id,
      clienteId: client.id,
      clienteNome: operationalContract.cliente || client.razaoSocial || client.nomeFantasia,
      clienteCnpj: client.cnpj,
      servico: operationalContract.servico,
      tipo: operationalContract.tipo,
      dataAgendada: scheduledDate,
      localExecucao: local,
      tags: equipmentTag,
      observacao: `Homologacao E2E ${runId}: agendamento criado automaticamente.`,
      tecnicosIds: technician?.id ? [technician.id] : [],
      tecnicosNomes: [technicianName],
      veiculoId: vehicle?.id || undefined,
      veiculoDescricao: vehicle ? `${vehicle.placa} - ${vehicle.modelo}` : undefined,
      status: "agendado",
    },
  });

  const orderResult = await requestJson(`/api/agendamentos/${scheduleResult.id}/gerar-os`, {
    token,
    method: "POST",
    body: { tecnicoNome: technicianName },
  });

  const closeResult = await requestJson(`/api/orders/${orderResult.id}/encerrar`, {
    token,
    method: "POST",
    body: {
      dataExecucao: executionDate,
      quantidade: 1,
      tagEquipamentoServico: equipmentTag,
      fotos: [onePixelJpeg],
      checklistRespostas: (service.checklistItens || []).slice(0, 5).map((item) => ({ item, concluido: true, observacao: "Validado no E2E tecnico" })),
      naoExecutada: false,
    },
  });

  const afterClose = await requestJson("/api/bootstrap", { token });
  const closedOrder = afterClose.orders?.find((order) => order.id === orderResult.id);
  const certificateHash = closeResult.certificateHash || closedOrder?.certificadoHash;
  const certificate = certificateHash ? await requestJson(`/api/certificates/${encodeURIComponent(certificateHash)}`, { token }) : null;
  if (certificate?.ok) {
    const record = certificate.certificate;
    const expectedClient = operationalContract.cliente || client.razaoSocial || client.nomeFantasia;
    assertE2e(record.osId === orderResult.id, "o certificado aponta para a mesma OS encerrada");
    assertE2e(record.clienteId === client.id, "o certificado aponta para o cliente do tenant");
    assertE2e(record.clienteNome === expectedClient, "cliente do certificado diverge do contrato/OS");
    assertE2e(record.servico === operationalContract.servico, "serviço do certificado diverge do catálogo/OS");
    assertE2e(record.snapshotDados?.os?.servicoCatalogoId === service.id, "snapshot do certificado não preserva o serviço do catálogo");
    const publicCertificate = await requestJson(`/api/certificates/${encodeURIComponent(certificateHash)}`);
    assertE2e(publicCertificate.ok && publicCertificate.certificate?.hash === certificateHash, "validação pública não retornou o certificado correspondente");
  }

  const measurement = await requestJson("/api/measurements/generate", {
    token,
    method: "POST",
    body: {
      clienteNome: operationalContract.cliente || client.razaoSocial || client.nomeFantasia,
      dataInicio: executionDate,
      dataFim: executionDate,
    },
  }).catch((error) => ({ ok: false, error: error.message }));

  let financialUpdate = null;
  if (measurement?.ok && measurement.measurement?.id) {
    financialUpdate = await requestJson(`/api/measurements/${measurement.measurement.id}/financial`, {
      token,
      method: "PATCH",
      body: {
        financeiroStatus: "nf_enviada",
        nfNumero: `NF-E2E-${runId}`,
        nfEnviadaEm: executionDate,
        pagamentoPrevistoEm: isoDatePlus(32),
        financeiroObservacao: "Atualizacao automatica do E2E tecnico de homologacao.",
      },
    });
  }

  const afterMeasurement = await requestJson("/api/bootstrap", { token });
  const recurrence = afterMeasurement.recurrenceSuggestions?.find((item) => item.sourceOsId === orderResult.id && item.status === "pendente");
  let recurrenceResult = null;
  if (recurrence) {
    recurrenceResult = await requestJson(`/api/recurrence-suggestions/${recurrence.id}`, {
      token,
      method: "PATCH",
      body: { action: "confirm" },
    });
  }
  const finalBootstrap = await requestJson("/api/bootstrap", { token });
  const confirmedRecurrence = recurrence ? finalBootstrap.recurrenceSuggestions?.find((item) => item.id === recurrence.id) : null;

  const rows = [
    ["Proposta criada", proposalNumber, "OK"],
    ["Proposta aprovada", proposalNumber, "OK"],
    ["Minuta gerada", minutaResult.numero, "OK"],
    ["Minuta aprovada", minutaResult.numero, "OK"],
    ["Contrato gerado", contractResult.numero, "OK"],
    ["Contrato operacional", operationalContract.id, "OK"],
    ["Agendamento", scheduleResult.id, "OK"],
    ["OS gerada", closedOrder?.numero || orderResult.id, "OK"],
    ["OS encerrada", closedOrder?.status || "encerrada", "OK"],
    ["Certificado", certificateHash || "-", certificateHash ? "OK" : "Nao aplicavel/verificar"],
    ["Validacao certificado", certificate?.certificate?.hash || "-", certificate?.ok ? "OK" : "Nao aplicavel/verificar"],
    ["Medicao", measurement?.measurement?.numero || measurement?.error || "-", measurement?.ok ? "OK" : "Verificar"],
    ["Acompanhamento medicao", financialUpdate?.financeiroStatus || "-", financialUpdate?.ok ? "OK" : measurement?.ok ? "Verificar" : "Nao executado"],
    ["Recorrencia", confirmedRecurrence?.status || "-", recurrenceResult?.ok ? "OK" : "Nao aplicavel/verificar"],
  ];
  const hasVerification = rows.some((row) => String(row[2]).toLowerCase().includes("verificar"));

  const report = [
    "# Execucao Tecnica E2E",
    "",
    `Ambiente: ${baseUrl}`,
    `Tenant: ${tenantSlug}`,
    `Executado em: ${brDateTime()}`,
    `Identificador da rodada: ${runId}`,
    "",
    "## Resultado",
    "",
    hasVerification ? "Status geral: Verificar" : "Status geral: Aprovado",
    "",
    "## Fluxo validado",
    "",
    markdownTable(["Etapa", "Documento/registro", "Resultado"], rows),
    "",
    "## Dados usados",
    "",
    markdownTable(
      ["Campo", "Valor"],
      [
        ["Cliente", operationalContract.cliente || client.razaoSocial || client.nomeFantasia],
        ["Servico", operationalContract.servico],
        ["Servico gera certificado", service.geraCertificado ? "sim" : "nao"],
        ["Recorrencia em dias", service.recorrenciaDias || 0],
        ["Tecnico", technicianName],
        ["Local", local],
        ["Tag/equipamento", equipmentTag],
        ["Data agendada", scheduledDate],
        ["Data executada", executionDate],
      ],
    ),
    "",
    "## Observacoes",
    "",
    "- Esta execucao cria dados reais na base de homologacao com prefixo E2E.",
    "- O teste humano ainda precisa validar UX, clareza das telas e aparencia dos documentos.",
    "- Se alguma etapa aparecer como verificar, revisar o registro criado antes de liberar a rodada assistida.",
    "",
  ].join("\n");

  await fs.mkdir(evidenceDir, { recursive: true });
  const outputPath = path.join(evidenceDir, "execucao-tecnica-e2e.md");
  await fs.writeFile(outputPath, report, "utf8");

  console.log(`E2E tecnico: ${hasVerification ? "verificar" : "aprovado"}`);
  console.log(`Relatorio: ${outputPath}`);
  console.log(JSON.stringify({
    runId,
    proposal: proposalNumber,
    minuta: minutaResult.numero,
    contract: contractResult.numero,
    operationalContract: operationalContract.id,
    schedule: scheduleResult.id,
    order: closedOrder?.numero || orderResult.id,
    certificateHash,
    measurement: measurement?.measurement?.numero || null,
    recurrence: confirmedRecurrence?.status || null,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
