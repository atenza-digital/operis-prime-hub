import assert from "node:assert/strict";
import crypto from "node:crypto";
import { ensureDatabaseShape, pool, withTransaction } from "../server/db.mjs";

const tenantSlug = process.env.HOMOLOGATION_TENANT_SLUG || "ciperprag";

async function main() {
  await ensureDatabaseShape();
  const result = await withTransaction(async (client) => {
    const { rows: tenantRows } = await client.query(
      "SELECT id FROM ciperprag_hub.tenants WHERE slug = $1 LIMIT 1",
      [tenantSlug],
    );
    const tenant = tenantRows[0];
    assert.ok(tenant, `Tenant nao encontrado: ${tenantSlug}`);

    const { rows: userRows } = await client.query(
      "SELECT id FROM ciperprag_hub.usuarios WHERE tenant_id = $1 ORDER BY id LIMIT 1",
      [tenant.id],
    );
    const { rows: serviceRows } = await client.query(
      "SELECT id FROM ciperprag_hub.servicos_catalogo WHERE tenant_id = $1 ORDER BY id LIMIT 1",
      [tenant.id],
    );
    const { rows: orderRows } = await client.query(
      "SELECT id FROM ciperprag_hub.ordens_servico WHERE tenant_id = $1 ORDER BY id LIMIT 1",
      [tenant.id],
    );
    const productId = `SMOKE-${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const movementIds = [];

    await client.query(
      `INSERT INTO ciperprag_hub.produtos_estoque
       (id, tenant_id, codigo, nome, unidade, quantidade_atual, estoque_minimo)
       VALUES ($1,$2,$3,'Produto smoke de homologacao','un.',0,0)`,
      [productId, tenant.id, productId],
    );

    if (serviceRows[0]) {
      await client.query(
        `INSERT INTO ciperprag_hub.servicos_catalogo_produtos
         (tenant_id, servico_id, produto_id, quantidade_prevista, unidade)
         VALUES ($1,$2,$3,1,'un.')`,
        [tenant.id, serviceRows[0].id, productId],
      );
    }

    await client.query(
      `UPDATE ciperprag_hub.produtos_estoque
       SET quantidade_atual = 12, atualizado_em = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [productId, tenant.id],
    );
    const entradaId = `SMOKE-MOV-${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
    movementIds.push(entradaId);
    await client.query(
      `INSERT INTO ciperprag_hub.estoque_movimentacoes
       (id, tenant_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, os_id, servico_id, observacao, criado_por)
       VALUES ($1,$2,$3,'entrada',12,0,12,NULL,$4,'Smoke de entrada', $5)`,
      [entradaId, tenant.id, productId, serviceRows[0]?.id || null, userRows[0]?.id || null],
    );

    const saidaId = `SMOKE-MOV-${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
    movementIds.push(saidaId);
    await client.query(
      `INSERT INTO ciperprag_hub.estoque_movimentacoes
       (id, tenant_id, produto_id, tipo, quantidade, saldo_anterior, saldo_posterior, os_id, servico_id, observacao, criado_por)
       VALUES ($1,$2,$3,'saida',3,12,9,$4,$5,'Smoke de baixa por OS',$6)`,
      [saidaId, tenant.id, productId, orderRows[0]?.id || null, serviceRows[0]?.id || null, userRows[0]?.id || null],
    );
    await client.query(
      `UPDATE ciperprag_hub.produtos_estoque
       SET quantidade_atual = 9, atualizado_em = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [productId, tenant.id],
    );

    const { rows: productRows } = await client.query(
      "SELECT quantidade_atual FROM ciperprag_hub.produtos_estoque WHERE id = $1 AND tenant_id = $2",
      [productId, tenant.id],
    );
    assert.equal(Number(productRows[0]?.quantidade_atual), 9, "Saldo final de estoque incorreto");

    const { rows: reportRows } = await client.query(
      `SELECT m.tipo, COUNT(*)::int AS movimentos, COALESCE(SUM(m.quantidade),0)::numeric AS quantidade
       FROM ciperprag_hub.estoque_movimentacoes m
       JOIN ciperprag_hub.produtos_estoque p ON p.id = m.produto_id AND p.tenant_id = m.tenant_id
       WHERE m.tenant_id = $1 AND m.produto_id = $2
       GROUP BY m.tipo
       ORDER BY m.tipo`,
      [tenant.id, productId],
    );
    assert.deepEqual(reportRows.map((row) => [row.tipo, Number(row.quantidade)]), [["entrada", 12], ["saida", 3]]);

    const { rows: sourceColumns } = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'ciperprag_hub'
         AND table_name = 'proposta_pdf_importacoes'
         AND column_name IN ('conteudo_base64','hash_sha256','texto_extraido','cobertura')`,
    );
    assert.equal(sourceColumns.length, 4, "Preservacao do PDF original incompleta");

    await client.query("DELETE FROM ciperprag_hub.estoque_movimentacoes WHERE id = ANY($1::text[])", [movementIds]);
    await client.query("DELETE FROM ciperprag_hub.servicos_catalogo_produtos WHERE tenant_id = $1 AND produto_id = $2", [tenant.id, productId]);
    await client.query("DELETE FROM ciperprag_hub.produtos_estoque WHERE id = $1 AND tenant_id = $2", [productId, tenant.id]);

    return { tenant: tenantSlug, produtoSmoke: productId, saldoTestado: 9, movimentosTestados: 2, pdfOriginalColumns: sourceColumns.length };
  });

  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main()
  .catch((error) => {
    console.error(`Smoke de estoque: falhou - ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
