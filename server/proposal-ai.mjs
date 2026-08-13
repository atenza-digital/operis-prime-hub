const MAX_DRAFT_SERVICES = 30;
const OPENAI_REQUEST_TIMEOUT_MS = 90_000;

async function fetchWithTimeout(url, init, timeoutMs = OPENAI_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export const PROPOSAL_ASSIST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["clienteId", "clienteNome", "clienteCnpj", "titulo", "objeto", "modalidade", "validadeDias", "locaisExecucao", "escopoTecnico", "condicoesComerciais", "servicos", "observacoes", "coberturaDocumento", "confianca", "camposPendentes", "avisos"],
  properties: {
    clienteId: { type: ["string", "null"] },
    clienteNome: { type: ["string", "null"] },
    clienteCnpj: { type: ["string", "null"] },
    titulo: { type: ["string", "null"] },
    objeto: { type: ["string", "null"] },
    modalidade: { type: ["string", "null"] },
    validadeDias: { type: ["integer", "null"] },
    locaisExecucao: { type: "array", items: { type: "string" } },
    escopoTecnico: { type: "array", items: { type: "string" } },
    condicoesComerciais: { type: "array", items: { type: "string" } },
    servicos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["servicoId", "servicoNome", "quantidade", "valorUnitario", "frequencia", "enderecoAtividade"],
        properties: {
          servicoId: { type: ["string", "null"] },
          servicoNome: { type: ["string", "null"] },
          quantidade: { type: ["number", "null"] },
          valorUnitario: { type: ["number", "null"] },
          frequencia: { type: ["string", "null"] },
          enderecoAtividade: { type: ["string", "null"] },
        },
      },
    },
    observacoes: { type: "array", items: { type: "string" } },
    coberturaDocumento: {
      type: "object",
      additionalProperties: false,
      required: ["paginasAnalisadas", "tabelasEncontradas", "itensExtraidos", "regrasFrequencia", "camposNaoInterpretados"],
      properties: {
        paginasAnalisadas: { type: ["integer", "null"] },
        tabelasEncontradas: { type: "integer" },
        itensExtraidos: { type: "integer" },
        regrasFrequencia: { type: "array", items: { type: "string" } },
        camposNaoInterpretados: { type: "array", items: { type: "string" } },
      },
    },
    confianca: { type: "string", enum: ["alta", "media", "baixa"] },
    camposPendentes: { type: "array", items: { type: "string" } },
    avisos: { type: "array", items: { type: "string" } },
  },
};

function text(value) {
  return String(value ?? "").trim();
}

function key(value) {
  return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function cnpjKey(value) {
  return text(value).replace(/\D/g, "");
}

function lines(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, 50) : [];
}

function finiteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const identifier = item?.servicoId || key(item?.servicoNome);
    if (!identifier || seen.has(identifier)) return false;
    seen.add(identifier);
    return true;
  });
}

function matchClient(draft, clients, warnings) {
  const suppliedId = text(draft.clienteId);
  if (suppliedId) {
    const byId = clients.find((client) => client.id === suppliedId);
    if (byId) return byId;
    warnings.push("O cliente indicado pela leitura não existe no cadastro deste tenant.");
  }
  const suppliedName = key(draft.clienteNome);
  const suppliedCnpj = cnpjKey(draft.clienteCnpj);
  const candidates = clients.filter((client) => {
    const nameMatches = suppliedName && [client.razaoSocial, client.nomeFantasia].some((name) => key(name) === suppliedName);
    const cnpjMatches = suppliedCnpj && cnpjKey(client.cnpj) === suppliedCnpj;
    return Boolean(nameMatches || cnpjMatches);
  });
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) warnings.push("Mais de um cliente coincide com os dados do PDF; selecione o cliente manualmente.");
  return null;
}

function matchService(item, services, warnings) {
  const suppliedId = text(item?.servicoId);
  if (suppliedId) {
    const byId = services.find((service) => service.id === suppliedId);
    if (byId) return byId;
    warnings.push(`O serviço ${suppliedId} indicado pela leitura não existe no catálogo.`);
  }
  const suppliedName = key(item?.servicoNome);
  if (!suppliedName) return null;
  const candidates = services.filter((service) => [service.nome, service.descricao].map(key).filter(Boolean).some((name) => name === suppliedName || name.startsWith(suppliedName) || suppliedName.startsWith(name)));
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) warnings.push(`O serviço "${text(item.servicoNome)}" possui mais de uma correspondência no catálogo.`);
  return null;
}

export function buildProposalCatalogContext({ clients = [], services = [] } = {}) {
  return {
    clientes: clients.slice(0, 250).map((client) => ({ id: client.id, razaoSocial: client.razaoSocial, nomeFantasia: client.nomeFantasia, cnpj: client.cnpj, endereco: client.endereco, municipio: client.municipio, uf: client.uf })),
    servicos: services.slice(0, 250).map((service) => ({ id: service.id, nome: service.nome, descricao: service.descricao, unidade: service.unidade, tipo: service.tipo, recorrenciaDias: service.recorrenciaDias, geraCertificado: service.geraCertificado })),
  };
}

export function normalizeProposalAssistDraft(input = {}, { clients = [], services = [] } = {}) {
  const warnings = lines(input.avisos);
  const pending = lines(input.camposPendentes);
  const coverageInput = input.coberturaDocumento || {};
  const coveragePending = lines(coverageInput.camposNaoInterpretados);
  coveragePending.forEach((item) => pending.push(`PDF: ${item}`));
  const client = matchClient(input, clients, warnings);
  if (!client) pending.push("cliente");
  const normalizedServices = uniqueById((Array.isArray(input.servicos) ? input.servicos : []).slice(0, MAX_DRAFT_SERVICES).map((item) => {
    const catalog = matchService(item, services, warnings);
    if (!catalog) pending.push(`serviço: ${text(item?.servicoNome) || "não identificado"}`);
    const quantity = finiteNumber(item?.quantidade, null);
    const unitValue = finiteNumber(item?.valorUnitario, null);
    if (!quantity || quantity <= 0) pending.push(`quantidade: ${text(item?.servicoNome) || "serviço"}`);
    if (unitValue === null || unitValue < 0) pending.push(`valor unitário: ${text(item?.servicoNome) || "serviço"}`);
    return {
      servicoId: catalog?.id || "",
      servicoNome: catalog?.nome || text(item?.servicoNome),
      quantidade: quantity && quantity > 0 ? quantity : 1,
      valorUnitario: unitValue !== null && unitValue >= 0 ? unitValue : 0,
      frequencia: text(item?.frequencia),
      enderecoAtividade: text(item?.enderecoAtividade),
    };
  }));
  if (!normalizedServices.length) pending.push("serviços");
  return {
    clienteId: client?.id || "",
    clienteNome: client?.razaoSocial || text(input.clienteNome),
    titulo: text(input.titulo),
    objeto: text(input.objeto),
    modalidade: text(input.modalidade),
    validadeDias: finiteNumber(input.validadeDias, 30),
    locaisExecucao: lines(input.locaisExecucao),
    escopoTecnico: lines(input.escopoTecnico),
    condicoesComerciais: lines(input.condicoesComerciais),
    servicos: normalizedServices,
    observacoes: lines(input.observacoes),
    coberturaDocumento: {
      paginasAnalisadas: finiteNumber(coverageInput.paginasAnalisadas, null),
      tabelasEncontradas: Math.max(0, Number(coverageInput.tabelasEncontradas || 0)),
      itensExtraidos: Math.max(0, Number(coverageInput.itensExtraidos || normalizedServices.length)),
      regrasFrequencia: lines(coverageInput.regrasFrequencia),
      camposNaoInterpretados: coveragePending,
    },
    confianca: ["alta", "media", "baixa"].includes(input.confianca) ? input.confianca : "baixa",
    camposPendentes: [...new Set(pending)],
    avisos: [...new Set(warnings)],
  };
}

export async function generateProposalAssistDraft({ apiKey, model = "gpt-4o-mini", fileName, buffer, context }) {
  if (!apiKey) throw new Error("A assistência de propostas está indisponível: OPENAI_API_KEY não foi configurada.");
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error("O PDF enviado está vazio ou inválido.");
  const headers = { Authorization: `Bearer ${apiKey}` };
  let fileId = null;
  try {
    const uploadForm = new FormData();
    uploadForm.append("purpose", "user_data");
    uploadForm.append("file", new Blob([buffer], { type: "application/pdf" }), fileName || "referencia.pdf");
    const uploadResponse = await fetchWithTimeout("https://api.openai.com/v1/files", { method: "POST", headers, body: uploadForm });
    const uploadBody = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) throw new Error(uploadBody?.error?.message || "Não foi possível enviar o PDF para análise.");
    fileId = uploadBody.id;
    const instructions = [
      "Você é um assistente de pré-preenchimento comercial do Atenza FieldOps.",
      "Leia o PDF de referência e extraia apenas dados explicitamente presentes nele.",
      "Não invente clientes, serviços, preços, quantidades, frequências, endereços ou condições.",
      "Associe clienteId e servicoId somente aos IDs exatos do catálogo enviado no contexto.",
      "Se não houver correspondência inequívoca, retorne null e registre o campo em camposPendentes.",
      "O resultado é um rascunho para revisão humana e nunca deve ser tratado como proposta aprovada.",
      "Responda exclusivamente no schema estruturado solicitado, em português do Brasil.",
      "Percorra o arquivo inteiro, de todas as paginas, incluindo cabecalhos, rodapes, tabelas, anexos e observacoes.",
      "Informe coberturaDocumento com paginas analisadas, tabelas encontradas, itens extraidos, regras de frequencia e campos nao interpretados.",
      "Nao descarte linhas de tabelas: quando uma linha nao puder ser associada ao catalogo, registre-a em camposNaoInterpretados.",
    ].join("\n");
    const response = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [{ role: "developer", content: [{ type: "input_text", text: instructions }] }, { role: "user", content: [{ type: "input_file", file_id: fileId }, { type: "input_text", text: `Cadastros disponíveis do tenant:\n${JSON.stringify(context)}` }] }],
        text: { format: { type: "json_schema", name: "proposal_draft", strict: true, schema: PROPOSAL_ASSIST_SCHEMA } },
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error?.message || "A análise do PDF não foi concluída.");
    const outputText = body.output_text || body.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("A API não retornou um rascunho estruturado.");
    return JSON.parse(outputText);
  } finally {
    if (fileId) await fetchWithTimeout(`https://api.openai.com/v1/files/${encodeURIComponent(fileId)}`, { method: "DELETE", headers }, 10_000).catch(() => undefined);
  }
}
