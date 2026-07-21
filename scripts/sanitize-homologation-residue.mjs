import crypto from "node:crypto";
import { pool, query, withTransaction } from "../server/db.mjs";

const schemaName = "ciperprag_hub";
const tenantSlug = process.argv.find((arg) => arg.startsWith("--tenant="))?.split("=")[1] || "ciperprag";
const apply = process.argv.includes("--apply");
const keepOpenSchedules = process.argv.includes("--keep-open-schedules");

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString?.().slice(0, 10) || null;
}

function historicalCertificateHtml(certificate) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${safeText(certificate.numero)}</title></head><body><h1>Certificado ${safeText(certificate.numero)}</h1><p><strong>Cliente:</strong> ${safeText(certificate.cliente_nome)}</p><p><strong>CNPJ:</strong> ${safeText(certificate.cliente_cnpj)}</p><p><strong>Serviço:</strong> ${safeText(certificate.servico)}</p><p><strong>OS:</strong> ${safeText(certificate.os_numero || certificate.os_id)}</p><p><strong>Execução:</strong> ${safeText(dateOnly(certificate.data_execucao) || "-")}</p><p><strong>Hash público:</strong> ${safeText(certificate.hash)}</p><p>Registro histórico imutável criado durante saneamento da base de homologação.</p></body></html>`;
}

function buildLegacyOrderClosureSnapshot(order) {
  const existing = order.snapshot_dados && typeof order.snapshot_dados === "object" ? order.snapshot_dados : {};
  return {
    ...existing,
    legado: true,
    encerramento: {
      os: {
        id: order.id,
        numero: order.numero || order.id,
        status: order.status,
        dataExecucao: dateOnly(order.data_execucao),
        quantidade: Number(order.quantidade || 0),
        unidade: order.unidade || null,
      },
      cliente: {
        id: order.cliente_id || null,
        nome: order.cliente,
        cnpj: order.cnpj,
        endereco: order.cliente_endereco || null,
      },
      servico: {
        nome: order.servico,
        tipo: order.tipo,
      },
      operacao: {
        tecnicoNome: order.tecnico || null,
        localExecucao: order.local_execucao || null,
        tags: order.tags || null,
        tagEquipamentoServico: order.tag_equipamento_servico || null,
        observacao: order.observacao || null,
      },
      evidencias: {
        fotosQuantidade: Array.isArray(order.fotos) ? order.fotos.length : 0,
      },
      saneamentoHomologacao: {
        motivo: "OS encerrada legada sem snapshot de encerramento",
        aplicadoEm: new Date().toISOString(),
      },
    },
  };
}

async function getTenant() {
  const { rows } = await query(
    `SELECT id, slug, nome_fantasia, razao_social
       FROM ${quoteIdent(schemaName)}.tenants
      WHERE slug = $1
      LIMIT 1`,
    [tenantSlug],
  );
  const tenant = rows[0];
  if (!tenant) throw new Error(`Tenant nao encontrado: ${tenantSlug}`);
  return tenant;
}

async function findCandidates(client, tenantId) {
  const candidates = {};

  candidates.orphanProposals = (await client.query(
    `SELECT p.id, p.numero, p.status, p.observacoes
       FROM ciperprag_hub.contratos_templates p
      WHERE p.tenant_id = $1
        AND p.tipo = 'proposta'
        AND p.status = 'aprovado'
        AND NOT EXISTS (
          SELECT 1
            FROM ciperprag_hub.contratos_templates m
           WHERE m.tenant_id = p.tenant_id
             AND m.tipo = 'minuta'
             AND m.observacoes ILIKE '%' || COALESCE(p.numero, p.id) || '%'
        )
      ORDER BY p.data_criacao NULLS FIRST, p.criado_em NULLS FIRST`,
    [tenantId],
  )).rows;

  candidates.contractsWithoutOperational = (await client.query(
    `SELECT t.id, t.numero, t.cliente_id, t.data_criacao, t.vigencia_meses, t.status, t.observacoes
       FROM ciperprag_hub.contratos_templates t
      WHERE t.tenant_id = $1
        AND t.tipo = 'contrato'
        AND t.status = 'vigente'
        AND NOT EXISTS (
          SELECT 1
            FROM ciperprag_hub.contratos o
           WHERE o.tenant_id = t.tenant_id
             AND o.contrato_template_id = t.id
        )
      ORDER BY t.data_criacao NULLS FIRST, t.criado_em NULLS FIRST`,
    [tenantId],
  )).rows;

  candidates.openSchedules = keepOpenSchedules ? [] : (await client.query(
    `SELECT id, cliente, servico, data_agendada, observacao
       FROM ciperprag_hub.agendamentos
      WHERE tenant_id = $1
        AND status = 'agendado'
        AND os_id IS NULL
      ORDER BY data_agendada NULLS FIRST, criado_em NULLS FIRST`,
    [tenantId],
  )).rows;

  candidates.ordersWithoutClosureSnapshot = (await client.query(
    `SELECT *
       FROM ciperprag_hub.ordens_servico
      WHERE tenant_id = $1
        AND status IN ('concluida', 'encerrada')
        AND snapshot_encerrado_em IS NULL
      ORDER BY data_execucao NULLS FIRST, criado_em NULLS FIRST`,
    [tenantId],
  )).rows;

  candidates.ordersWithoutMeasurement = (await client.query(
    `SELECT o.*, c.valor_unitario
       FROM ciperprag_hub.ordens_servico o
       LEFT JOIN ciperprag_hub.contratos c
         ON c.id = o.contrato_id
        AND c.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1
        AND o.status IN ('concluida', 'encerrada')
        AND NOT EXISTS (
          SELECT 1
            FROM ciperprag_hub.medicao_itens mi
           WHERE mi.os_id = o.id
        )
      ORDER BY o.data_execucao NULLS FIRST, o.criado_em NULLS FIRST`,
    [tenantId],
  )).rows;

  candidates.certificatesWithoutAttachment = (await client.query(
    `SELECT c.*
       FROM ciperprag_hub.certificados c
      WHERE c.tenant_id = $1
        AND c.status = 'emitido'
        AND NOT EXISTS (
          SELECT 1
            FROM ciperprag_hub.evidencias_anexos e
           WHERE e.tenant_id = c.tenant_id
             AND e.entidade_tipo = 'certificado'
             AND e.entidade_id = c.id
             AND e.categoria = 'pdf_historico'
             AND e.imutavel = TRUE
        )
      ORDER BY c.emitido_em NULLS FIRST`,
    [tenantId],
  )).rows;

  return candidates;
}

async function syncOperationalContracts(client, tenantId, templates) {
  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    const { rows: services } = await client.query(
      `SELECT
         s.id AS template_servico_id,
         s.servico_id,
         s.quantidade,
         s.valor_unitario,
         s.frequencia,
         sc.nome,
         sc.tipo,
         sc.unidade,
         sc.recorrencia_dias,
         sc.produtos_quimicos,
         sc.epis,
         sc.riscos,
         cli.razao_social,
         cli.nome_fantasia,
         cli.cnpj
       FROM ciperprag_hub.contratos_templates_servicos s
       JOIN ciperprag_hub.contratos_templates t
         ON t.id = s.template_id
        AND t.tenant_id = $2
       LEFT JOIN ciperprag_hub.servicos_catalogo sc
         ON sc.id = s.servico_id
        AND sc.tenant_id = $2
       LEFT JOIN ciperprag_hub.clientes cli
         ON cli.id = t.cliente_id
        AND cli.tenant_id = $2
      WHERE s.template_id = $1
      ORDER BY s.id`,
      [template.id, tenantId],
    );
    const validServices = services.filter((service) => service.servico_id && service.nome);
    if (!validServices.length) {
      skipped += 1;
      continue;
    }

    for (const service of validServices) {
      const id = makeId("CTO");
      const clientName = service.razao_social || service.nome_fantasia || "Cliente sem nome";
      const vigenciaInicio = dateOnly(template.data_criacao) || new Date().toISOString().slice(0, 10);
      const vigenciaFim = template.vigencia_meses
        ? new Date(new Date(`${vigenciaInicio}T12:00:00`).setMonth(new Date(`${vigenciaInicio}T12:00:00`).getMonth() + Number(template.vigencia_meses))).toISOString().slice(0, 10)
        : null;
      await client.query(
        `INSERT INTO ciperprag_hub.contratos
         (id, tenant_id, contrato_template_id, contrato_template_servico_id, servico_catalogo_id, numero_comercial,
          cliente_id, cliente, cnpj, servico, tipo, contratado, executado, unidade, status, validade_dias,
          valor_unitario, frequencia, produtos_quimicos, epis, riscos, vigencia_inicio, vigencia_fim)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$13,'ativo',$14,$15,$16,$17,$18,$19,$20,$21)`,
        [
          id,
          tenantId,
          template.id,
          service.template_servico_id,
          service.servico_id,
          template.numero,
          template.cliente_id,
          clientName,
          service.cnpj || null,
          service.nome,
          service.tipo || "sanitario",
          service.quantidade,
          service.unidade || "serviços",
          service.recorrencia_dias || 0,
          service.valor_unitario || 0,
          service.frequencia || null,
          service.produtos_quimicos || [],
          service.epis || [],
          service.riscos || [],
          vigenciaInicio,
          vigenciaFim,
        ],
      );
      created += 1;
    }
  }

  return { created, skipped };
}

async function createLegacyMeasurements(client, tenantId, orders) {
  const groups = new Map();
  for (const order of orders) {
    const key = order.cliente_id || order.cliente || "sem-cliente";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(order);
  }

  let measurements = 0;
  let items = 0;
  for (const rows of groups.values()) {
    const first = rows[0];
    const measurementId = makeId("MEDLEG");
    const number = `MED-LEG-${Date.now().toString(36).toUpperCase()}-${measurements + 1}`;
    const dates = rows.map((row) => dateOnly(row.data_execucao)).filter(Boolean).sort();
    const start = dates[0] || new Date().toISOString().slice(0, 10);
    const end = dates[dates.length - 1] || start;
    const measurementItems = rows.map((row) => {
      const unitValue = Number(row.valor_unitario || 0);
      const quantity = Number(row.quantidade || 0);
      return {
        osId: row.id,
        osNumber: row.numero || row.id,
        contractId: row.contrato_id || null,
        service: row.servico,
        date: dateOnly(row.data_execucao) || end,
        quantity,
        unit: row.unidade || "serviços",
        unitValue,
        total: quantity * unitValue,
      };
    });
    const total = measurementItems.reduce((sum, item) => sum + item.total, 0);
    const snapshot = {
      legado: true,
      origem: "saneamento_homologacao",
      cliente: { id: first.cliente_id || null, nome: first.cliente, cnpj: first.cnpj || null, endereco: first.cliente_endereco || null },
      periodo: { inicio: start, fim: end },
      itens: measurementItems,
      total,
      observacao: "Medição histórica criada para vincular OS legadas de homologação já encerradas.",
    };

    await client.query(
      `INSERT INTO ciperprag_hub.medicoes
       (id, tenant_id, numero, cliente_id, cliente_nome, cliente_cnpj, cliente_endereco, periodo_inicio, periodo_fim,
        status, financeiro_status, total, forma_pagamento, local_entrega, snapshot_dados, financeiro_observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'cancelada','cancelada',$10,$11,$12,$13,$14)`,
      [
        measurementId,
        tenantId,
        number,
        first.cliente_id || null,
        first.cliente,
        first.cnpj || null,
        first.cliente_endereco || null,
        start,
        end,
        total,
        "Medição histórica de homologação",
        "Base de homologação",
        JSON.stringify(snapshot),
        "Criada automaticamente para sanear OS legadas já encerradas antes da rodada assistida.",
      ],
    );

    for (const item of measurementItems) {
      await client.query(
        `INSERT INTO ciperprag_hub.medicao_itens
         (medicao_id, os_id, os_numero, contrato_id, servico, data_execucao, quantidade, unidade, valor_unitario, valor_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [measurementId, item.osId, item.osNumber, item.contractId, item.service, item.date, item.quantity, item.unit, item.unitValue, item.total],
      );
      items += 1;
    }
    measurements += 1;
  }

  return { measurements, items };
}

async function createHistoricalCertificateAttachments(client, tenantId, certificates) {
  let created = 0;
  for (const certificate of certificates) {
    const html = historicalCertificateHtml(certificate);
    const contentBase64 = Buffer.from(html, "utf8").toString("base64");
    const fileHash = sha256(html);
    const snapshotHash = sha256(JSON.stringify(certificate.snapshot_dados || {}));
    await client.query(
      `INSERT INTO ciperprag_hub.evidencias_anexos
       (id, tenant_id, entidade_tipo, entidade_id, categoria, nome_arquivo, mime_type, tamanho_bytes,
        conteudo_base64, metadados, hash_sha256, snapshot_hash_sha256, template_codigo, template_versao, imutavel)
       VALUES ($1,$2,'certificado',$3,'pdf_historico',$4,'text/html; charset=utf-8',$5,$6,$7,$8,$9,'certificado-legado-html','homologacao-saneamento-v1',TRUE)`,
      [
        makeId("ANX"),
        tenantId,
        certificate.id,
        `certificado-${String(certificate.numero || certificate.id).replaceAll("/", "-")}-legado.html`,
        Buffer.byteLength(html, "utf8"),
        contentBase64,
        JSON.stringify({ origem: "saneamento_homologacao", certificadoHash: certificate.hash, tipo: "html_historico_legado" }),
        fileHash,
        snapshotHash,
      ],
    );
    created += 1;
  }
  return { created };
}

async function main() {
  const tenant = await getTenant();
  const actions = {};
  let candidates;

  await withTransaction(async (client) => {
    candidates = await findCandidates(client, tenant.id);

    actions.cancelOrphanProposals = candidates.orphanProposals.length;
    actions.syncOperationalContracts = candidates.contractsWithoutOperational.length;
    actions.cancelOpenSchedules = candidates.openSchedules.length;
    actions.enrichOrderClosureSnapshots = candidates.ordersWithoutClosureSnapshot.length;
    actions.createLegacyMeasurementsForOrders = candidates.ordersWithoutMeasurement.length;
    actions.createHistoricalCertificateAttachments = candidates.certificatesWithoutAttachment.length;

    if (!apply) return;

    if (candidates.orphanProposals.length) {
      await client.query(
        `UPDATE ciperprag_hub.contratos_templates
            SET status = 'encerrado',
                observacoes = CONCAT(COALESCE(observacoes, ''), CASE WHEN COALESCE(observacoes, '') = '' THEN '' ELSE E'\n' END, '[Saneamento homologação] Proposta aprovada antiga encerrada por não possuir minuta vinculada.'),
                atualizado_em = NOW()
          WHERE tenant_id = $1
            AND id = ANY($2::text[])`,
        [tenant.id, candidates.orphanProposals.map((item) => item.id)],
      );
    }

    const syncResult = await syncOperationalContracts(client, tenant.id, candidates.contractsWithoutOperational);
    actions.operationalContractsCreated = syncResult.created;
    actions.operationalContractsSkipped = syncResult.skipped;

    if (candidates.openSchedules.length) {
      await client.query(
        `UPDATE ciperprag_hub.agendamentos
            SET status = 'cancelado',
                observacao = CONCAT(COALESCE(observacao, ''), CASE WHEN COALESCE(observacao, '') = '' THEN '' ELSE E'\n' END, '[Saneamento homologação] Agendamento antigo sem OS cancelado antes da rodada assistida.'),
                atualizado_em = NOW()
          WHERE tenant_id = $1
            AND id = ANY($2::text[])`,
        [tenant.id, candidates.openSchedules.map((item) => item.id)],
      );
    }

    for (const order of candidates.ordersWithoutClosureSnapshot) {
      await client.query(
        `UPDATE ciperprag_hub.ordens_servico
            SET snapshot_dados = $1::jsonb,
                snapshot_encerrado_em = COALESCE(atualizado_em, NOW()),
                atualizado_em = NOW()
          WHERE id = $2
            AND tenant_id = $3`,
        [JSON.stringify(buildLegacyOrderClosureSnapshot(order)), order.id, tenant.id],
      );
    }

    const legacyMeasurementResult = await createLegacyMeasurements(client, tenant.id, candidates.ordersWithoutMeasurement);
    actions.legacyMeasurementsCreated = legacyMeasurementResult.measurements;
    actions.legacyMeasurementItemsCreated = legacyMeasurementResult.items;

    const certificateAttachmentResult = await createHistoricalCertificateAttachments(client, tenant.id, candidates.certificatesWithoutAttachment);
    actions.historicalCertificateAttachmentsCreated = certificateAttachmentResult.created;
  });

  const sample = Object.fromEntries(
    Object.entries(candidates).map(([key, rows]) => [
      key,
      rows.slice(0, 5).map((row) => ({
        id: row.id,
        numero: row.numero || row.os_numero || row.hash || null,
        cliente: row.cliente || row.cliente_nome || null,
        servico: row.servico || null,
        data: dateOnly(row.data_agendada || row.data_execucao || row.data_criacao || row.emitido_em),
      })),
    ]),
  );

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    tenant: tenant.slug,
    actions,
    sample,
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
