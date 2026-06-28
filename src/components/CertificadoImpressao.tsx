import { addDays, getBootstrap, type BootstrapData, type CertificadoApp } from "@/lib/api";
import logoCiperprag from "@/assets/logo_ciperprag_certificado.png";
import brasaoPrefeitura from "@/assets/brasao_prefeitura_parauapebas.png";
import assinatura from "@/assets/assinatura_certificado.png";
import iconeLateral from "@/assets/icone_lateral_certificado.png";
import templateCertificado from "@/template_certificado_dinamico.html?raw";
import QRCode from "qrcode";

function fmtDate(date: string) {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildCertificateVerificationUrl(hash: string) {
  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseOrigin}/validar-certificado/${encodeURIComponent(hash)}`;
}

function toBase64Img(url: string): Promise<string> {
  return new Promise((resolve) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(String(event.target?.result || url));
        reader.readAsDataURL(blob);
      })
      .catch(() => resolve(url));
  });
}

function renderGaleria(fotos: string[]) {
  if (!fotos.length) return "";
  return `
    <div class="gallery">
      ${fotos
        .slice(0, 3)
        .map(
          (foto, index) => `
            <div class="gallery-item">
              <img src="${foto}" alt="Evidencia ${index + 1}" />
            </div>`,
        )
        .join("")}
    </div>
  `;
}

function renderProdutos(cert: CertificadoApp) {
  const produtos = (cert.produtosDetalhados ?? []).length
    ? cert.produtosDetalhados!
    : (cert.produtosQuimicos ?? []).map((nome) => ({
        nome,
        grupoQuimico: "—",
        qtUso: "Conf. necessidade",
        diluente: "Agua",
        volAplicado: "Conf. area",
        combate: "Aplicacao direta",
        antidoto: "Anti-histaminico",
      }));

  if (!produtos.length) {
    return `<tr><td colspan="7" style="text-align:center;color:#888">Nao aplicavel para este servico</td></tr>`;
  }

  return produtos
    .map(
      (produto) => `
        <tr>
          <td>${escapeHtml(produto.nome)}</td>
          <td>${escapeHtml(produto.grupoQuimico ?? "—")}</td>
          <td>${escapeHtml(produto.qtUso ?? "Conf. necessidade")}</td>
          <td>${escapeHtml(produto.diluente ?? "Agua")}</td>
          <td>${escapeHtml(produto.volAplicado ?? "Conf. area")}</td>
          <td>${escapeHtml(produto.combate ?? "Aplicacao direta")}</td>
          <td>${escapeHtml(produto.antidoto ?? "Anti-histaminico")}</td>
        </tr>`,
    )
    .join("");
}

function renderLicencas(cert: CertificadoApp, bootstrap: BootstrapData) {
  const company = bootstrap.companyConfig;
  return [
    { titulo: "CERTIFICADO", valor: cert.numero },
    { titulo: "MTRR", valor: "151012245873" },
    { titulo: "MEIO AMBIENTE", valor: "Nº102/2024" },
    { titulo: "C.R.02", valor: company?.cr02 || "—" },
    { titulo: "CTR02", valor: "1657521/2024" },
    { titulo: "ALVARA", valor: company?.alvara || "—" },
    { titulo: "VIG. SANITARIA", valor: company?.vigilanciaSanitaria || "—" },
  ]
    .map(({ titulo, valor }) => `<div><strong>${escapeHtml(titulo)}</strong><br>${escapeHtml(valor)}</div>`)
    .join("");
}

export async function imprimirCertificado(cert: CertificadoApp) {
  const bootstrap = await getBootstrap();
  const os = bootstrap.orders.find((item) => item.id === cert.osId);
  const fotos = os?.fotos ?? [];
  const validadeInicio = fmtDate(cert.dataExecucao);
  const validadeFim = cert.validadeDias > 0 ? fmtDate(addDays(cert.dataExecucao, cert.validadeDias)) : "Indeterminado";
  const verifyUrl = buildCertificateVerificationUrl(cert.hash);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 104, margin: 1 });

  const [logoSrc, brasaoSrc, assinaturaSrc, lateralSrc] = await Promise.all([
    toBase64Img(logoCiperprag),
    toBase64Img(brasaoPrefeitura),
    toBase64Img(assinatura),
    toBase64Img(iconeLateral),
  ]);

  const textoCertificado = `Certificamos para os devidos fins que a empresa <strong>${escapeHtml(
    cert.clienteNome,
  )}</strong> recebeu a execucao do servico de <strong>${escapeHtml(
    cert.servico,
  )}</strong>, conforme os procedimentos tecnicos aplicaveis e em conformidade com as exigencias sanitarias vigentes, inclusive a RDC 652/2022 quando cabivel.`;

  const html = templateCertificado
    .replaceAll("{{icone_lateral}}", lateralSrc)
    .replaceAll("{{logo_ciperprag}}", logoSrc)
    .replaceAll("{{brasao_prefeitura}}", brasaoSrc)
    .replaceAll("{{assinatura_responsavel}}", assinaturaSrc)
    .replaceAll("{{validade_inicio}}", validadeInicio)
    .replaceAll("{{validade_fim}}", validadeFim)
    .replaceAll(
      "{{logo_cliente_html}}",
      cert.clienteLogoUrl
        ? `<img class="logo-cliente" src="${cert.clienteLogoUrl}" alt="Logo do cliente" />`
        : "",
    )
    .replaceAll("{{empresa_nome}}", escapeHtml(cert.clienteNome))
    .replaceAll("{{cliente_cnpj}}", escapeHtml(cert.clienteCnpj))
    .replaceAll("{{cliente_endereco}}", escapeHtml(cert.clienteEndereco ?? ""))
    .replaceAll("{{local_execucao}}", escapeHtml(cert.localExecucao))
    .replaceAll("{{galeria_html}}", renderGaleria(fotos))
    .replaceAll("{{produtos_quimicos_html}}", renderProdutos(cert))
    .replaceAll("{{licencas_html}}", renderLicencas(cert, bootstrap))
    .replaceAll("{{texto_certificado}}", textoCertificado)
    .replaceAll("{{qr_code_url}}", qrDataUrl)
    .replaceAll("{{certificado_hash}}", escapeHtml(cert.hash))
    .replaceAll("{{certificado_validacao_url}}", escapeHtml(verifyUrl));

  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) return;

  printWindow.document.write(`${html}<script>window.onload = function(){ window.print(); }</script>`);
  printWindow.document.close();
}
