export async function ensureCustomerDefaultLocations(query) {
  // Older startup seeds assigned every default location to Ciperprag.
  // Repair only the deterministic defaults, preserving manually created locations.
  await query(`
    UPDATE ciperprag_hub.cliente_locais_execucao l
       SET tenant_id = c.tenant_id, atualizado_em = NOW()
      FROM ciperprag_hub.clientes c
     WHERE l.cliente_id = c.id AND l.id = 'LOC-' || c.id
       AND c.tenant_id IS NOT NULL
       AND l.tenant_id IS DISTINCT FROM c.tenant_id
  `);
  await query(`
    INSERT INTO ciperprag_hub.cliente_locais_execucao
      (id, tenant_id, cliente_id, nome, endereco, bairro, municipio, uf, cep, ativo)
    SELECT 'LOC-' || c.id, c.tenant_id, c.id,
           COALESCE(NULLIF(c.nome_fantasia, ''), c.razao_social),
           c.endereco, c.bairro, c.municipio, c.uf, c.cep, TRUE
      FROM ciperprag_hub.clientes c
     WHERE c.tenant_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM ciperprag_hub.cliente_locais_execucao l WHERE l.cliente_id = c.id
       )
    ON CONFLICT (id) DO NOTHING
  `);
}
