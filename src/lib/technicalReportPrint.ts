import tenantLogoFallback from "@/assets/logo_ciperprag.png";
import { montserratDocumentFontFaces } from "@/lib/documentFontFaces";
import { formatDateBr } from "@/lib/formatters";
import { repairMojibake } from "@/lib/repairMojibake";
import type { BootstrapData, EmpresaConfig, OSApp, ServicoCatalogo } from "@/lib/api";

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cleanText(value: string | number | null | undefined, fallback = "Não informado") {
  const cleaned = repairMojibake(String(value ?? "").trim());
  return cleaned || fallback;
}

function normalizeOsNumber(numero?: string) {
  const raw = cleanText(numero, "");
  const normalized = raw.replace(/^OS[-\s]*/i, "").trim();
  return normalized ? `OS nº ${normalized}` : "OS não informada";
}

function getService(os: OSApp, bootstrap: BootstrapData | null): ServicoCatalogo | undefined {
  return bootstrap?.services.find((service) => service.nome === os.servico || service.id === (os.snapshotDados as Record<string, unknown> | undefined)?.servicoId);
}

function getCompanyLogo(company?: EmpresaConfig | null) {
  return (
    company?.certificadoConfig?.documentLogoLightUrl ||
    company?.certificadoConfig?.logoPrincipalUrl ||
    company?.certificadoConfig?.logoInterfaceUrl ||
    company?.logoUrl ||
    tenantLogoFallback
  );
}

function getPrimaryColor(company?: EmpresaConfig | null) {
  return company?.certificadoConfig?.corPrimaria || company?.corPrimaria || "#087f5b";
}

function renderList(items: string[] | undefined, fallback: string) {
  const safeItems = (items ?? []).map((item) => cleanText(item, "")).filter(Boolean);
  if (!safeItems.length) return `<p class="muted">${escapeHtml(fallback)}</p>`;
  return `<ul>${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderChecklist(os: OSApp, service?: ServicoCatalogo) {
  const respostas = os.checklistRespostas ?? [];
  if (respostas.length) {
    return respostas
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(cleanText(item.item, "Item de checklist"))}</td>
            <td class="center">${item.concluido ? "Concluído" : "Pendente"}</td>
            <td>${escapeHtml(cleanText(item.observacao, "Sem observação"))}</td>
          </tr>
        `,
      )
      .join("");
  }

  const checklist = service?.checklistItens ?? [];
  if (!checklist.length) {
    return `<tr><td colspan="3" class="muted">Checklist técnico não parametrizado para este serviço.</td></tr>`;
  }

  return checklist
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(cleanText(item, "Item de checklist"))}</td>
          <td class="center">A validar</td>
          <td class="muted">Preencher na execução ou no encerramento.</td>
        </tr>
      `,
    )
    .join("");
}

function renderPhotos(os: OSApp) {
  const photos = (os.evidencias?.length ? os.evidencias.map((item) => item.conteudoBase64).filter(Boolean) : os.fotos ?? []).slice(0, 3);
  if (!photos.length) {
    return `<p class="muted">Nenhuma foto vinculada a esta OS.</p>`;
  }

  return `
    <div class="photo-grid">
      ${photos
        .map(
          (photo, index) => `
            <figure>
              <img src="${escapeHtml(photo)}" alt="Evidência fotográfica ${index + 1}" />
              <figcaption>Foto ${index + 1}</figcaption>
            </figure>
          `,
        )
        .join("")}
    </div>
  `;
}

export function buildTechnicalReportHtml(os: OSApp, bootstrap: BootstrapData | null) {
  const company = bootstrap?.companyConfig;
  const service = getService(os, bootstrap);
  const primary = getPrimaryColor(company);
  const companyLogo = getCompanyLogo(company);
  const equipe = os.equipeTecnicosNomes?.length ? os.equipeTecnicosNomes.join(" • ") : os.tecnicoNome;
  const reportNumber = `RT-${cleanText(os.numero, os.id).replace(/^OS[-\s]*/i, "")}`;
  const executionDate = os.dataExecucao || os.dataEmissao;
  const title = "Relatório Técnico";

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - ${escapeHtml(reportNumber)}</title>
  <style>
    ${montserratDocumentFontFaces}
    @page { size: A4 portrait; margin: 15mm 14mm 17mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #142033;
      background: #fff;
      font-family: "Montserrat", Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
    }
    .page {
      position: relative;
      min-height: 267mm;
      padding-bottom: 18mm;
    }
    .doc-header {
      display: grid;
      grid-template-columns: 42mm 1fr auto;
      gap: 14mm;
      align-items: center;
      border-bottom: 2px solid ${primary};
      padding-bottom: 8mm;
      margin-bottom: 9mm;
    }
    .logo {
      max-width: 38mm;
      max-height: 19mm;
      object-fit: contain;
      object-position: left center;
    }
    .doc-kicker {
      color: ${primary};
      font-size: 7pt;
      font-weight: 800;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }
    h1 {
      margin: 1.5mm 0 0;
      font-size: 18pt;
      line-height: 1.15;
      text-transform: uppercase;
    }
    .doc-code {
      border: 1px solid #d8e1e8;
      border-radius: 12px;
      padding: 4mm 5mm;
      text-align: right;
      min-width: 42mm;
    }
    .doc-code strong {
      display: block;
      font-size: 12pt;
    }
    .doc-code span {
      color: #607086;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .section {
      break-inside: avoid;
      margin-top: 6.5mm;
    }
    .section h2 {
      display: flex;
      gap: 3mm;
      align-items: center;
      margin: 0 0 3.5mm;
      color: #172033;
      font-size: 11.5pt;
      line-height: 1.2;
    }
    .section h2::before {
      content: "";
      display: block;
      width: 2mm;
      height: 6mm;
      border-radius: 999px;
      background: ${primary};
    }
    .card {
      border: 1px solid #d8e1e8;
      border-radius: 13px;
      padding: 4.4mm;
      background: #fff;
    }
    .muted { color: #617089; }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
    }
    .field-label {
      display: block;
      margin-bottom: 1mm;
      color: #607086;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .field-value {
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 10px;
      font-size: 9.2pt;
    }
    thead th {
      background: ${primary};
      color: #fff;
      font-size: 8pt;
      padding: 3mm 2.6mm;
      text-align: left;
      text-transform: uppercase;
    }
    tbody td {
      border-bottom: 1px solid #e6edf2;
      padding: 3mm 2.6mm;
      vertical-align: top;
    }
    .center { text-align: center; }
    ul {
      margin: 0;
      padding-left: 5mm;
    }
    li + li { margin-top: 1.4mm; }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
    }
    figure {
      margin: 0;
      border: 1px solid #d8e1e8;
      border-radius: 12px;
      overflow: hidden;
      background: #f8faf9;
    }
    figure img {
      display: block;
      width: 100%;
      height: 30mm;
      object-fit: cover;
    }
    figcaption {
      padding: 2mm 3mm;
      color: #607086;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16mm;
      margin-top: 9mm;
      break-inside: avoid;
    }
    .signature-line {
      border-top: 1px solid #172033;
      padding-top: 2mm;
      text-align: center;
      font-size: 8.5pt;
    }
    .footer {
      position: fixed;
      right: 14mm;
      bottom: 8mm;
      left: 14mm;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #d8e1e8;
      padding-top: 3mm;
      color: #607086;
      font-size: 7.3pt;
      font-weight: 600;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section, .card, table, .signature-grid { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="doc-header">
      <img class="logo" src="${escapeHtml(companyLogo)}" alt="Logo ${escapeHtml(company?.nomeFantasia || company?.tenantNome || "do tenant")}" />
      <div>
        <div class="doc-kicker">Documento operacional</div>
        <h1>${title}</h1>
        <p class="muted">Registro técnico derivado da ordem de serviço encerrada, sem informações comerciais ou valores de contrato.</p>
      </div>
      <div class="doc-code">
        <span>${escapeHtml(reportNumber)}</span>
        <strong>${escapeHtml(normalizeOsNumber(os.numero))}</strong>
      </div>
    </header>

    <section class="section">
      <h2>Identificação da execução</h2>
      <div class="card grid-3">
        <div><span class="field-label">Cliente</span><span class="field-value">${escapeHtml(cleanText(os.clienteNome))}</span></div>
        <div><span class="field-label">CNPJ</span><span class="field-value">${escapeHtml(cleanText(os.clienteCnpj))}</span></div>
        <div><span class="field-label">Execução</span><span class="field-value">${escapeHtml(formatDateBr(executionDate))}</span></div>
        <div><span class="field-label">Serviço</span><span class="field-value">${escapeHtml(cleanText(os.servico))}</span></div>
        <div><span class="field-label">Contrato</span><span class="field-value">${escapeHtml(cleanText(os.contratoId))}</span></div>
        <div><span class="field-label">Quantidade</span><span class="field-value">${escapeHtml(os.quantidade)} ${escapeHtml(cleanText(os.unidade, "un."))}</span></div>
        <div><span class="field-label">Local</span><span class="field-value">${escapeHtml(cleanText(os.localExecucao))}</span></div>
        <div><span class="field-label">Tag/equipamento</span><span class="field-value">${escapeHtml(cleanText(os.tagEquipamentoServico || os.tags, "Não se aplica"))}</span></div>
        <div><span class="field-label">Veículo</span><span class="field-value">${escapeHtml(cleanText(os.veiculoDescricao, "Não informado"))}</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Equipe e registro de campo</h2>
      <div class="card grid-2">
        <div><span class="field-label">Equipe designada</span><span class="field-value">${escapeHtml(cleanText(equipe))}</span></div>
        <div><span class="field-label">Responsável técnico</span><span class="field-value">${escapeHtml(cleanText(company?.certificadoConfig?.responsavelTecnico || company?.responsavelTecnico || os.tecnicoNome))}</span></div>
        <div><span class="field-label">Situação da OS</span><span class="field-value">${os.naoExecutada ? "Não executada" : "Executada"}</span></div>
        <div><span class="field-label">Emissão do relatório</span><span class="field-value">${escapeHtml(formatDateBr(new Date().toISOString()))}</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Descrição técnica</h2>
      <div class="card">
        <p>${escapeHtml(cleanText(service?.descricao || os.observacao || os.servico))}</p>
        ${os.naoExecutada ? `<p><strong>Motivo da não execução:</strong> ${escapeHtml(cleanText(os.motivoNaoExecucao))}</p>` : ""}
      </div>
    </section>

    <section class="section">
      <h2>Procedimentos e checklist</h2>
      <table>
        <thead>
          <tr><th>Item verificado</th><th class="center">Status</th><th>Observação</th></tr>
        </thead>
        <tbody>${renderChecklist(os, service)}</tbody>
      </table>
    </section>

    <section class="section">
      <h2>EPIs, normas e produtos</h2>
      <div class="card grid-3">
        <div><span class="field-label">EPIs</span>${renderList(service?.epis, "EPIs não parametrizados.")}</div>
        <div><span class="field-label">Normas</span>${renderList(service?.normasAplicaveis, "Normas não parametrizadas.")}</div>
        <div><span class="field-label">Produtos</span>${renderList(service?.produtosQuimicos, "Sem produtos vinculados.")}</div>
      </div>
    </section>

    <section class="section">
      <h2>Evidências fotográficas</h2>
      <div class="card">${renderPhotos(os)}</div>
    </section>

    <section class="section">
      <h2>Observações finais</h2>
      <div class="card">
        <p>${escapeHtml(cleanText(os.observacao, "Serviço registrado conforme OS encerrada e evidências anexadas."))}</p>
      </div>
    </section>

    <section class="signature-grid">
      <div class="signature-line">
        <strong>${escapeHtml(cleanText(company?.razaoSocial || company?.tenantNome || company?.nomeFantasia))}</strong><br />
        ${escapeHtml(cleanText(company?.responsavelExecucao || company?.responsavelTecnico || "Responsável pela execução"))}
      </div>
      <div class="signature-line">
        <strong>${escapeHtml(cleanText(os.clienteNome))}</strong><br />
        Cliente / conferência técnica
      </div>
    </section>

    <footer class="footer">
      <span>${escapeHtml(reportNumber)} · ${escapeHtml(normalizeOsNumber(os.numero))}</span>
      <span>${escapeHtml(cleanText(company?.cnpj, ""))}</span>
    </footer>
  </main>
</body>
</html>`;
}

export function printTechnicalReport(os: OSApp, bootstrap: BootstrapData | null) {
  const printWindow = window.open("", "_blank", "width=1024,height=900");
  if (!printWindow) return;
  printWindow.document.write(`${buildTechnicalReportHtml(os, bootstrap)}<script>window.onload=function(){window.print();}</script>`);
  printWindow.document.close();
}
