export function validateScheduleOrigin({ contractId, contract, service, desiredStatus = "agendado" }) {
  if (!service || service.ativo === false) {
    return { ok: false, error: "Selecione um servico ativo do catalogo para o agendamento." };
  }

  if (!contractId || ["cancelado", "encerrado"].includes(desiredStatus)) {
    return { ok: true, avulso: !contractId, serviceId: service.id };
  }

  const balance = Number(contract?.contratado || 0) - Number(contract?.executado || 0);
  if (!contract) {
    return { ok: false, error: "Contrato operacional nao encontrado para o agendamento." };
  }
  if (contract.status !== "ativo" || balance <= 0) {
    return { ok: false, error: "Contrato sem saldo operacional disponivel para novo agendamento." };
  }
  if (contract.template_tipo !== "contrato" || contract.template_status !== "vigente") {
    return { ok: false, error: "A agenda aceita apenas contratos finais vigentes. Gere e aprove a minuta antes do contrato final." };
  }
  if (contract.servico_catalogo_id && contract.servico_catalogo_id !== service.id) {
    return { ok: false, error: "O serviço selecionado não corresponde ao item do contrato." };
  }

  return { ok: true, avulso: false, serviceId: service.id };
}

export function canGenerateOrderFromSchedule({ contractId, contract, service }) {
  return validateScheduleOrigin({ contractId, contract, service }).ok;
}

// Keep the schedule INSERT parameter order in one place so schema changes
// cannot silently reintroduce a column/value mismatch.
export function buildScheduleInsertValues({
  id,
  tenantId,
  contractId = null,
  serviceId,
  customerId,
  customerName,
  customerCnpj,
  serviceName,
  serviceType,
  scheduledDate,
  locationId = null,
  locationName,
  tags = null,
  notes = null,
  technicianIds = [],
  technicianNames = [],
  vehicleId = null,
  vehicleDescription = null,
  status = "agendado",
}) {
  return [
    id,
    tenantId,
    contractId,
    serviceId,
    customerId,
    customerName,
    customerCnpj,
    serviceName,
    serviceType,
    scheduledDate,
    locationId,
    locationName,
    tags,
    notes,
    technicianIds,
    technicianNames,
    vehicleId,
    vehicleDescription,
    status,
  ];
}
