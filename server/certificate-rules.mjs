function clean(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export function resolveCertificateSource({ order = {}, customer = null, service = null } = {}) {
  // Documentos oficiais devem identificar o contratante pela razao social.
  // O nome fantasia continua disponivel nos cadastros, mas nao substitui a
  // identificacao juridica no texto declaratorio do certificado.
  const clientName = clean(customer?.razao_social || customer?.nome_fantasia || order.cliente);
  const clientCnpj = clean(customer?.cnpj || order.cnpj);
  const clientAddress = customer
    ? [customer.endereco, customer.bairro, customer.municipio && customer.uf ? `${customer.municipio}-${customer.uf}` : customer.municipio || customer.uf]
        .map(clean)
        .filter(Boolean)
        .join(", ")
    : clean(order.cliente_endereco);
  const serviceName = clean(service?.nome || order.servico);
  const serviceType = clean(service?.tipo || order.tipo);

  return {
    clientId: customer?.id || order.cliente_id || null,
    clientName,
    clientCnpj,
    clientAddress,
    clientLogoUrl: customer?.logo_url || order.cliente_logo_url || null,
    serviceId: service?.id || order.servico_catalogo_id || null,
    serviceName,
    serviceType,
    contractId: order.contrato_id || null,
  };
}

export function assertCertificateSource(source) {
  const missing = [
    !source?.clientName && "cliente",
    !source?.clientCnpj && "CNPJ do cliente",
    !source?.serviceName && "serviço do catálogo",
    !source?.serviceId && "identificação do serviço",
  ].filter(Boolean);

  if (missing.length) {
    const error = new Error(`Não foi possível emitir o certificado: faltam ${missing.join(", ")}.`);
    error.status = 409;
    throw error;
  }
}
